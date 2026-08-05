/**
 * Vision Scanner Service
 * Uses Gemini Vision to extract data from prescription/lab result photos.
 */

import { supabase } from '@/integrations/supabase/client';

// Cliente sem tipagem estrita para tabelas ainda não presentes nos tipos gerados.
const sb: any = supabase;
async function runScan(file: File, scanType: ScanType): Promise<Record<string, any>> {
  const image = await fileToBase64(file);
  const { data, error } = await supabase.functions.invoke('vision-scan', {
    body: { image, mimeType: file.type || 'image/jpeg', scanType },
  });
  if (error) throw error;
  if (!data || (data as any).error) throw new Error((data as any)?.error ?? 'Falha na análise');
  return data as Record<string, any>;
}

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

  const { error } = await sb.storage
    .from('vision-scans')
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw new Error(error.message);

  const { data } = await sb.storage.from('vision-scans').createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? path;
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

export async function scanPrescription(file: File): Promise<{
  medications: DetectedMedication[];
  doctor_name?: string;
  facility?: string;
  date?: string;
  next_appointment?: string;
}> {
  const data = await runScan(file, 'prescription');
  return { medications: data.medications ?? [], ...data } as any;
}

export async function scanLabResult(file: File): Promise<{
  test_name?: string;
  results: DetectedLabResult[];
  date?: string;
  lab_name?: string;
}> {
  const data = await runScan(file, 'lab_result');
  return { results: data.results ?? [], ...data } as any;
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
  return await runScan(file, 'medicine_label');
}

/** Generic scan for doctor notes, vaccine cards and other documents. */
export async function scanDocument(file: File, scanType: ScanType): Promise<Record<string, any>> {
  return await runScan(file, scanType);
}

// ─── Save & fetch ──────────────────────────────────────────────────────────

export async function saveScan(userId: string, scan: Omit<VisionScan, 'id' | 'user_id' | 'created_at'>): Promise<VisionScan> {
  const { data, error } = await sb
    .from('vision_scans')
    .insert({ user_id: userId, ...scan, model_used: 'gemini-2.0-flash' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as VisionScan;
}

export async function getScans(userId: string, limit: number = 20): Promise<VisionScan[]> {
  const { data, error } = await sb
    .from('vision_scans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []) as VisionScan[];
}

export async function updateScanReview(scanId: string, corrections: Record<string, any>): Promise<void> {
  const { error } = await sb
    .from('vision_scans')
    .update({
      was_reviewed_by_user: true,
      was_corrected: Object.keys(corrections).length > 0,
      user_corrections: corrections,
    })
    .eq('id', scanId);
  if (error) throw new Error(error.message);
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
