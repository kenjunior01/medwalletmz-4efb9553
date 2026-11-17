/**
 * Vision Scanner Service
 * Uses Gemini Vision to extract data from prescription/lab result photos.
 */

import { supabase as typedSupabase } from '@/integrations/supabase/client';
// Cast para acesso a tabelas ainda não presentes nos tipos gerados
const supabase = typedSupabase as any;
import { geminiAnalyzeImage, geminiStructured, isGeminiConfigured } from '@/lib/gemini';
import { nemotronChat, nemotronEmbed, isNemotronAvailable } from '@/lib/nemotron';

import { logger } from '@/lib/logger';
export type ScanType = 'prescription' | 'lab_result' | 'medicine_label' | 'doctor_note' | 'vaccine_card' | 'other';

export interface DetectedMedication {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
}

export interface DetectedLabResult {
  parameter: string;
  value: string;
  unit?: string;
  reference_range?: string;
  status?: 'normal' | 'high' | 'low' | 'critical';
}

export interface VisionScan {
  id?: string;
  user_id?: string;
  scan_type: ScanType;
  image_url: string;
  extracted_data?: Record<string, any>;
  detected_medications?: DetectedMedication[];
  detected_doctor?: string;
  detected_facility?: string;
  detected_date?: string;
  detected_next_appointment?: string;
  detected_test_name?: string;
  detected_results?: DetectedLabResult[];
  confidence_score?: number;
  was_reviewed_by_user?: boolean;
  was_corrected?: boolean;
  user_corrections?: Record<string, any>;
  linked_prescription_id?: string;
  linked_lab_order_id?: string;
  language_detected?: string;
  model_used?: string;
  created_at?: string;
}

// ─── Upload ────────────────────────────────────────────────────────────────

export async function uploadScanImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('vision-scans')
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('vision-scans').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Scan functions ────────────────────────────────────────────────────────

const PRESCRIPTION_PROMPT = `Analisa esta imagem de receita médica e extrai:
- Medicamentos (nome, dosagem, frequência, duração, notas)
- Nome do médico
- Nome da clínica/facilidade
- Data da receita
- Próxima consulta (se mencionada)

Responde em JSON com esta estrutura:
{
  "medications": [{"name":"", "dosage":"", "frequency":"", "duration":"", "notes":""}],
  "doctor_name": "",
  "facility": "",
  "date": "YYYY-MM-DD",
  "next_appointment": "YYYY-MM-DD"
}

Se um campo não for legível, use null. Não inventes dados.`;

const LAB_RESULT_PROMPT = `Analisa esta imagem de resultado de laboratório e extrai:
- Nome do teste
- Resultados: parâmetro, valor, unidade, range de referência, status (normal/high/low/critical)
- Data
- Laboratório

Responde em JSON:
{
  "test_name": "",
  "results": [{"parameter":"", "value":"", "unit":"", "reference_range":"", "status":""}],
  "date": "YYYY-MM-DD",
  "lab_name": ""
}

Se um campo não for legível, use null. Não inventes dados.`;

const MEDICINE_LABEL_PROMPT = `Analisa esta imagem de rótulo de medicamento e extrai:
- Nome comercial
- Ingrediente ativo
- Dosagem
- Fabricante
- Data de validade
- Número de lote
- Instruções de uso

Responde em JSON:
{
  "name": "",
  "active_ingredient": "",
  "dosage": "",
  "manufacturer": "",
  "expiry_date": "YYYY-MM-DD",
  "batch_number": "",
  "instructions": ""
}`;

// ─── F49.2 · Visão NVIDIA Nemotron VL (motor principal) ───────────────────

/**
 * Extracção JSON via Nemotron VL (120B) com fallback silencioso.
 * Devolve null em qualquer falha → o chamador cai para Gemini sem quebrar.
 */
async function nemotronVisionScan<T>(
  prompt: string, file: File, validate: (o: Record<string, unknown>) => boolean
): Promise<T | null> {
  if (!isNemotronAvailable()) return null;
  try {
    const res = await nemotronChat({
      mode: 'raw',
      systemPrompt: `${prompt}\n\nResponde APENAS com o JSON pedido, sem markdown nem explicações.`,
      images: [{ mime: file.type || 'image/jpeg', b64: await fileToBase64(file) }],
      temperature: 0.1,
      max_tokens: 1500,
      // F52: reasoning limitado — extração JSON não precisa de cadeia longa (teste: 0.6-0.8s)
      reasoning_budget: 1024,
    });
    const jsonText = res.text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const parsed = jsonText ? JSON.parse(jsonText) : null;
    if (!parsed || typeof parsed !== 'object' || !validate(parsed)) return null;
    return parsed as T;
  } catch (err) {
    logger.warn('Nemotron VL indisponível — cai para Gemini:', { error: err });
    return null;
  }
}

export async function scanPrescription(file: File): Promise<{
  medications: DetectedMedication[];
  doctor_name?: string;
  facility?: string;
  date?: string;
  next_appointment?: string;
}> {
  // F49.2: Nemotron VL primeiro; Gemini só se o gateway falhar
  const nv = await nemotronVisionScan<{
    medications: DetectedMedication[];
    doctor_name?: string; facility?: string; date?: string; next_appointment?: string;
  }>(PRESCRIPTION_PROMPT, file, (o) => Array.isArray((o as any).medications));
  if (nv) return nv;

  if (!isGeminiConfigured()) {
    return { medications: [], doctor_name: undefined, facility: undefined, date: undefined, next_appointment: undefined };
  }
  try {
    return await geminiStructured(
      PRESCRIPTION_PROMPT,
      {
        fallback: { medications: [] },
        models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite'],
        body: {
          contents: [{
            role: 'user',
            parts: [
              { text: PRESCRIPTION_PROMPT },
              {
                inlineData: {
                  mimeType: file.type || 'image/jpeg',
                  data: await fileToBase64(file),
                },
              },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1500, responseMimeType: 'application/json' },
        },
      }
    );
  } catch (err) {
    logger.error('scanPrescription error:', { error: err });
    return { medications: [] };
  }
}

export async function scanLabResult(file: File): Promise<{
  test_name?: string;
  results: DetectedLabResult[];
  date?: string;
  lab_name?: string;
}> {
  const nv = await nemotronVisionScan<{
    test_name?: string; results: DetectedLabResult[]; date?: string; lab_name?: string;
  }>(LAB_RESULT_PROMPT, file, (o) => Array.isArray((o as any).results));
  if (nv) return nv;

  if (!isGeminiConfigured()) {
    return { results: [] };
  }
  try {
    return await geminiStructured(
      LAB_RESULT_PROMPT,
      {
        fallback: { results: [] },
        models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite'],
        body: {
          contents: [{
            role: 'user',
            parts: [
              { text: LAB_RESULT_PROMPT },
              { inlineData: { mimeType: file.type || 'image/jpeg', data: await fileToBase64(file) } },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1500, responseMimeType: 'application/json' },
        },
      }
    );
  } catch (err) {
    logger.error('scanLabResult error:', { error: err });
    return { results: [] };
  }
}

export async function scanMedicineLabel(file: File): Promise<{
  name?: string;
  active_ingredient?: string;
  dosage?: string;
  manufacturer?: string;
  expiry_date?: string;
  batch_number?: string;
  instructions?: string;
}> {
  const nv = await nemotronVisionScan<{
    name?: string; active_ingredient?: string; dosage?: string; manufacturer?: string;
    expiry_date?: string; batch_number?: string; instructions?: string;
  }>(MEDICINE_LABEL_PROMPT, file, (o) => typeof (o as any).name === 'string');
  if (nv) return nv;

  if (!isGeminiConfigured()) {
    return {};
  }
  try {
    return await geminiStructured(
      MEDICINE_LABEL_PROMPT,
      {
        fallback: {},
        models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite'],
        body: {
          contents: [{
            role: 'user',
            parts: [
              { text: MEDICINE_LABEL_PROMPT },
              { inlineData: { mimeType: file.type || 'image/jpeg', data: await fileToBase64(file) } },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 800, responseMimeType: 'application/json' },
        },
      }
    );
  } catch (err) {
    logger.error('scanMedicineLabel error:', { error: err });
    return {};
  }
}

// ─── Save & fetch ──────────────────────────────────────────────────────────

export async function saveScan(userId: string, scan: Omit<VisionScan, 'id' | 'user_id' | 'created_at'>): Promise<VisionScan> {
  const { data, error } = await supabase
    .from('vision_scans')
    .insert({ user_id: userId, ...scan, model_used: 'gemini-2.0-flash' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as VisionScan;
}

export async function getScans(userId: string, limit: number = 20): Promise<VisionScan[]> {
  const { data, error } = await supabase
    .from('vision_scans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []) as VisionScan[];
}

export async function updateScanReview(scanId: string, corrections: Record<string, any>): Promise<void> {
  const { error } = await supabase
    .from('vision_scans')
    .update({
      was_reviewed_by_user: true,
      was_corrected: Object.keys(corrections).length > 0,
      user_corrections: corrections,
    })
    .eq('id', scanId);
  if (error) throw new Error(error.message);
}

// ─── F52 · Semântica (NVIDIA embeddings 4096d) ────────────────────────────

/** Texto que representa uma digitalização no espaço vetorial (para busca). */
export function buildScanText(scan: VisionScan): string {
  const meds = (scan.detected_medications ?? []).map(m => `${m.name} ${m.dosage ?? ''}`.trim()).join(', ');
  const labs = (scan.detected_results ?? []).map(r => r.parameter).join(', ');
  const extra = scan.extracted_data
    ? Object.values(scan.extracted_data).filter(v => typeof v === 'string' || typeof v === 'number').join(', ')
    : '';
  return [
    `tipo: ${scan.scan_type}`,
    meds ? `medicamentos: ${meds}` : '',
    scan.detected_doctor ? `médico: ${scan.detected_doctor}` : '',
    scan.detected_facility ? `facilidade: ${scan.detected_facility}` : '',
    scan.detected_test_name ? `exame: ${scan.detected_test_name}` : '',
    labs ? `parâmetros: ${labs}` : '',
    extra,
  ].filter(Boolean).join(' — ').slice(0, 4000);
}

/** F52-3: produtos de farmácias semelhantes a um nome de medicamento (catálogo mPharma real). */
export async function findSimilarProducts(
  medName: string,
): Promise<Array<{ product_name: string; price: number | null; similarity: number }>> {
  if (!isNemotronAvailable()) return [];
  try {
    const [vec] = await nemotronEmbed({ input: [medName], input_type: 'query' });
    if (!vec) return [];
    const { data, error } = await supabase.rpc('match_products_semantic', {
      query_embedding: JSON.stringify(vec),
      p_max_results: 4,
    });
    if (error || !data) return [];
    const seen = new Set<string>();
    return (data as Array<Record<string, unknown>>)
      .filter(r => Number(r.similarity) >= 0.55)
      .filter(r => {
        const k = String(r.product_name).toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map(r => ({
        product_name: String(r.product_name),
        price: r.price != null ? Number(r.price) : null,
        similarity: Number(r.similarity),
      }));
  } catch (err) {
    logger.warn('Busca semântica de produtos indisponível:', { error: err });
    return [];
  }
}

/** Indexa uma digitalização (chamado após saveScan — embed do texto extraído). Falha silenciosa. */
export async function embedAndSaveScan(scanId: string, text: string): Promise<void> {
  try {
    const [vec] = await nemotronEmbed({ input: [text], input_type: 'passage' });
    if (!vec) return;
    await supabase.from('scan_embeddings').insert({ scan_id: scanId, embedding: JSON.stringify(vec) });
  } catch (err) {
    logger.warn('Embedding de scan falhou (não bloqueia):', { error: err });
  }
}

export interface SemanticScanHit extends Partial<VisionScan> {
  similarity: number;
}

/** F52-4: busca semântica nas digitalizações do utilizador (RPC com RLS via auth.uid()). */
export async function searchScansSemantic(term: string, maxResults = 8): Promise<SemanticScanHit[]> {
  try {
    const [vec] = await nemotronEmbed({ input: [term], input_type: 'query' });
    if (!vec) return [];
    const { data, error } = await supabase.rpc('match_scans_semantic', {
      query_embedding: JSON.stringify(vec),
      p_max_results: maxResults,
    });
    if (error || !data) return [];
    return (data as Array<Record<string, unknown>>).map(r => ({
      ...(r.scan as Record<string, unknown> ?? {}),
      similarity: Number(r.similarity),
    })) as SemanticScanHit[];
  } catch (err) {
    logger.warn('Busca semântica de digitalizações indisponível:', { error: err });
    return [];
  }
}

/** Indexa digitalizações antigas sem embedding (máx. `limit` por invocação). */
export async function backfillScanEmbeddings(userId: string, limit = 20): Promise<number> {
  try {
    const [scansRes, embRes] = await Promise.all([
      supabase.from('vision_scans').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      supabase.from('scan_embeddings').select('scan_id').limit(2000),
    ]);
    if (scansRes.error || embRes.error) return 0;
    const have = new Set(((embRes.data ?? []) as Array<{ scan_id: string }>).map(r => r.scan_id));
    const todo = ((scansRes.data ?? []) as VisionScan[]).filter(s => s.id && !have.has(s.id)).slice(0, limit);
    let done = 0;
    for (const s of todo) {
      const [vec] = await nemotronEmbed({ input: [buildScanText(s)], input_type: 'passage' });
      if (!vec) continue;
      const { error } = await supabase.from('scan_embeddings').insert({ scan_id: s.id, embedding: JSON.stringify(vec) });
      if (!error) done += 1;
    }
    return done;
  } catch (err) {
    logger.warn('Backfill de embeddings falhou:', { error: err });
    return 0;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
