/**
 * ScanResult — página de resultados do Scanner IA:
 * resumo do documento, campos extraídos e imagem original com URL assinado.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Download, CheckCircle2, AlertTriangle, RefreshCw, Camera, Share2,
} from '@/components/icons/lucide-compat';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { getScan, getScanImageSignedUrl, updateScanReview, type VisionScan } from '@/services/visionScanner';

const TYPE_LABELS: Record<string, string> = {
  prescription: 'Receita médica',
  lab_result: 'Resultado laboratorial',
  medicine_label: 'Rótulo de medicamento',
  doctor_note: 'Nota médica',
  vaccine_card: 'Cartão de vacinas',
  other: 'Documento de saúde',
};

const FIELD_LABELS: Record<string, string> = {
  doctor_name: 'Médico',
  facility: 'Unidade / Clínica',
  lab_name: 'Laboratório',
  date: 'Data',
  next_appointment: 'Próxima consulta',
  test_name: 'Exame',
  name: 'Nome',
  active_ingredient: 'Princípio ativo',
  dosage: 'Dosagem',
  manufacturer: 'Fabricante',
  expiry_date: 'Validade',
  batch_number: 'Lote',
  instructions: 'Instruções',
  patient_name: 'Paciente',
  summary: 'Resumo',
  text: 'Texto detetado',
};

function isEmpty(v: unknown) {
  return v == null || v === '' || (Array.isArray(v) && v.length === 0);
}

export default function ScanResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth() as any;

  const [scan, setScan] = useState<VisionScan | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getScan(id);
      if (!data) { setError('Digitalização não encontrada.'); return; }
      setScan(data);
      if (data.image_url) setImageUrl(await getScanImageSignedUrl(data.image_url));
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar a digitalização.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const handleDownload = async () => {
    if (!scan?.image_url) return;
    const url = await getScanImageSignedUrl(scan.image_url);
    if (!url) { toast.error('Imagem indisponível.'); return; }
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan-${scan.id}.jpg`;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleConfirm = async () => {
    if (!id) return;
    setConfirming(true);
    try {
      await updateScanReview(id, {});
      setScan((s) => (s ? { ...s, was_reviewed_by_user: true } : s));
      toast.success('Digitalização confirmada.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Não foi possível confirmar.');
    } finally {
      setConfirming(false);
    }
  };

  const handleShare = async () => {
    const url = scan?.image_url ? await getScanImageSignedUrl(scan.image_url) : null;
    if (!url) return;
    try {
      if (navigator.share) await navigator.share({ title: 'Documento digitalizado', url });
      else { await navigator.clipboard.writeText(url); toast.success('Link temporário copiado.'); }
    } catch { /* cancelado */ }
  };

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="font-semibold">Inicia sessão para ver os teus documentos digitalizados.</p>
        <Button onClick={() => navigate('/auth')}>Entrar</Button>
      </div>
    );
  }

  const data = (scan?.extracted_data ?? {}) as Record<string, any>;
  const simpleFields = Object.entries(data).filter(
    ([k, v]) => !isEmpty(v) && typeof v !== 'object' && !['confidence', 'medications', 'results'].includes(k),
  );
  const meds = scan?.detected_medications ?? data.medications ?? [];
  const results = scan?.detected_results ?? data.results ?? [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/health/scanner')} aria-label="Voltar" className="min-h-[44px] min-w-[44px]">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <div className="flex-1">
          <h1 className="font-bold text-lg">Resultado do Scanner IA</h1>
          <p className="text-xs text-muted-foreground">{scan ? TYPE_LABELS[scan.scan_type] ?? 'Documento' : ''}</p>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        {loading ? (
          <div className="space-y-3"><Skeleton className="h-40 w-full" /><Skeleton className="h-32 w-full" /></div>
        ) : error ? (
          <div role="alert" className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {error}
          </div>
        ) : scan ? (
          <>
            {/* Resumo */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">{TYPE_LABELS[scan.scan_type] ?? 'Documento'}</Badge>
                  <div className="flex items-center gap-2">
                    {scan.confidence_score != null && (
                      <Badge variant="outline">Confiança {Math.round(scan.confidence_score * 100)}%</Badge>
                    )}
                    {scan.was_reviewed_by_user && (
                      <Badge className="bg-emerald-600 text-white border-0">Revisto</Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {data.summary || `Foram extraídos ${simpleFields.length + meds.length + results.length} campos deste documento.`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {scan.created_at ? new Date(scan.created_at).toLocaleString() : ''}
                </p>
              </CardContent>
            </Card>

            {/* Imagem */}
            {imageUrl && (
              <Card className="overflow-hidden">
                <img src={imageUrl} alt="Documento digitalizado" className="w-full max-h-96 object-contain bg-muted" loading="lazy" />
                <CardContent className="p-3 flex gap-2">
                  <Button variant="outline" onClick={handleDownload} className="flex-1 min-h-[44px]">
                    <Download className="h-4 w-4 mr-2" aria-hidden="true" /> Baixar imagem
                  </Button>
                  <Button variant="outline" onClick={handleShare} className="min-h-[44px]" aria-label="Partilhar link temporário">
                    <Share2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Campos extraídos */}
            {simpleFields.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="font-semibold mb-3 text-sm">Campos extraídos</h2>
                  <dl className="space-y-2">
                    {simpleFields.map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 text-sm border-b border-border/50 pb-2 last:border-0">
                        <dt className="text-muted-foreground">{FIELD_LABELS[k] ?? k}</dt>
                        <dd className="font-medium text-right break-words">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            )}

            {/* Medicamentos */}
            {meds.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="font-semibold mb-3 text-sm">Medicamentos detetados</h2>
                  <ul className="space-y-2">
                    {meds.map((m: any, i: number) => (
                      <li key={i} className="p-3 rounded-lg bg-muted/40">
                        <p className="font-semibold text-sm">{m.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[m.dosage, m.frequency, m.duration].filter(Boolean).join(' · ')}
                        </p>
                        {m.notes && <p className="text-xs mt-1">{m.notes}</p>}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Resultados laboratoriais */}
            {results.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="font-semibold mb-3 text-sm">Resultados</h2>
                  <ul className="space-y-2">
                    {results.map((r: any, i: number) => (
                      <li key={i} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40">
                        <div>
                          <p className="font-medium text-sm">{r.parameter}</p>
                          {r.reference_range && <p className="text-xs text-muted-foreground">Ref: {r.reference_range}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{r.value} {r.unit}</p>
                          {r.status && (
                            <Badge variant={r.status === 'normal' ? 'outline' : 'destructive'} className="text-[10px]">{r.status}</Badge>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => navigate('/health/scanner')} className="min-h-[44px]">
                <Camera className="h-4 w-4 mr-2" aria-hidden="true" /> Digitalizar outro
              </Button>
              <Button onClick={handleConfirm} disabled={confirming || scan.was_reviewed_by_user} className="flex-1 min-h-[44px]">
                {confirming ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" />}
                {scan.was_reviewed_by_user ? 'Já revisto' : 'Confirmar dados'}
              </Button>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
