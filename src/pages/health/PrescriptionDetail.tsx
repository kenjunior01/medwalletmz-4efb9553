import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FileText, Pill, Zap, ShieldCheck, Download, CheckCircle2, Share2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

export default function PrescriptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [presc, setPresc] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [doctorName, setDoctorName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [pharmacies, setPharmacies] = useState<{id:string; name:string; city?:string|null}[]>([]);
  const [chosenId, setChosenId] = useState<string>('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: p } = await supabase.from('prescriptions').select('*').eq('id', id).maybeSingle();
      if (!p) return;
      setPresc(p);
      setChosenId(p.chosen_pharmacy_id || p.suggested_pharmacy_id || '');
      const { data: its } = await supabase.from('prescription_items').select('*').eq('prescription_id', id);
      setItems(its || []);
      const { data: prof } = await supabase.from('profiles').select('full_name').eq('user_id', p.doctor_id).maybeSingle();
      setDoctorName(prof?.full_name || 'Médico');
      const { data: pat } = await supabase.from('profiles').select('full_name').eq('user_id', p.patient_id).maybeSingle();
      setPatientName(pat?.full_name || 'Paciente');
    })();
  }, [id]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('stores').select('id, name, city')
        .eq('is_active', true).eq('type', 'pharmacy').order('name');
      setPharmacies(data || []);
    })();
  }, []);

  if (!presc) return <div className="p-4">A carregar...</div>;

  const expired = presc.expires_at && new Date(presc.expires_at) < new Date();
  const isPatient = user?.id === presc.patient_id;
  const suggested = pharmacies.find(p => p.id === presc.suggested_pharmacy_id);
  const chosen = pharmacies.find(p => p.id === presc.chosen_pharmacy_id);

  const confirmPharmacy = async () => {
    if (!chosenId) { toast.error('Escolhe uma farmácia'); return; }
    setConfirming(true);
    const { error } = await supabase.from('prescriptions')
      .update({ chosen_pharmacy_id: chosenId, pharmacy_confirmed_at: new Date().toISOString() })
      .eq('id', presc.id);
    setConfirming(false);
    if (error) { toast.error(error.message); return; }
    setPresc({ ...presc, chosen_pharmacy_id: chosenId, pharmacy_confirmed_at: new Date().toISOString() });
    toast.success('Farmácia confirmada');
  };

  const buildPdf = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    let y = 18;
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('Receita Medica Digital', pageW / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('MocambiApp Health Hub', pageW / 2, y, { align: 'center' });
    y += 10;
    doc.setDrawColor(180); doc.line(15, y, pageW - 15, y); y += 8;
    doc.setFontSize(11);
    doc.text(`Paciente: ${patientName}`, 15, y); y += 6;
    doc.text(`Medico: Dr(a). ${doctorName}`, 15, y); y += 6;
    doc.text(`Emitida: ${new Date(presc.created_at).toLocaleString('pt-PT')}`, 15, y); y += 6;
    if (presc.expires_at) { doc.text(`Valida ate: ${new Date(presc.expires_at).toLocaleDateString('pt-PT')}`, 15, y); y += 6; }
    if (chosen) { doc.text(`Farmacia: ${chosen.name}${chosen.city ? ` (${chosen.city})` : ''}`, 15, y); y += 6; }
    if (presc.requires_cold_chain) { doc.setTextColor(30, 100, 200); doc.text('* Requer cadeia de frio (friagem)', 15, y); doc.setTextColor(0); y += 6; }
    y += 4; doc.setDrawColor(220); doc.line(15, y, pageW - 15, y); y += 8;
    doc.setFont('helvetica', 'bold'); doc.text('Medicamentos:', 15, y); y += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    items.forEach((it, idx) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}. ${it.medication_name}`, 15, y); y += 5;
      doc.setFont('helvetica', 'normal');
      const line = [it.dosage, it.frequency, it.duration].filter(Boolean).join(' • ');
      if (line) { doc.text(line, 20, y); y += 5; }
      if (it.instructions) { doc.text(`Instrucoes: ${it.instructions}`, 20, y, { maxWidth: pageW - 35 }); y += 6; }
      y += 2;
    });
    if (presc.notes) { y += 4; doc.setFont('helvetica', 'bold'); doc.text('Observacoes:', 15, y); y += 5; doc.setFont('helvetica', 'normal'); doc.text(presc.notes, 15, y, { maxWidth: pageW - 30 }); }
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`ID: ${presc.id}`, 15, 285);
    doc.text('Documento assinado digitalmente.', pageW - 15, 285, { align: 'right' });
    return doc;
  };

  const fileName = () => `receita-${presc.id.slice(0,8)}.pdf`;

  const downloadPdf = () => buildPdf().save(fileName());

  const sharePdf = async () => {
    const doc = buildPdf();
    const blob = doc.output('blob');
    const file = new File([blob], fileName(), { type: 'application/pdf' });
    const shareText = `Receita Digital — Dr(a). ${doctorName}`;
    try {
      const navAny = navigator as any;
      if (navAny.canShare && navAny.canShare({ files: [file] })) {
        await navAny.share({ files: [file], title: 'Receita Digital', text: shareText });
        return;
      }
      if (navAny.share) {
        await navAny.share({ title: 'Receita Digital', text: shareText });
        return;
      }
      // Fallback: WhatsApp web link com texto
      const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(url, '_blank');
      doc.save(fileName());
      toast.info('PDF descarregado. Anexa-o na conversa.');
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast.error('Não foi possível partilhar');
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-bold">Receita Digital</h1>
      </div>

      <Card className="p-4 bg-gradient-to-br from-primary/5 to-pharmacy/5 border-primary/20">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-pharmacy" /> Receita verificada</p>
            <p className="font-semibold mt-1">Dr(a). {doctorName}</p>
            <p className="text-xs text-muted-foreground">Paciente: {patientName}</p>
            <p className="text-xs text-muted-foreground">Emitida: {new Date(presc.created_at).toLocaleDateString('pt-PT')}</p>
            {presc.expires_at && (
              <p className="text-xs text-muted-foreground">Válida até: {new Date(presc.expires_at).toLocaleDateString('pt-PT')}</p>
            )}
          </div>
          <Badge variant={expired ? 'outline' : 'default'}>{expired ? 'Expirada' : presc.status}</Badge>
        </div>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Medicamentos</h2>
        {items.map((it, idx) => (
          <Card key={it.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-pharmacy/10 flex items-center justify-center flex-shrink-0">
                <Pill className="h-5 w-5 text-pharmacy" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-semibold">{idx + 1}. {it.medication_name}</p>
                {it.dosage && <p className="text-sm">💊 {it.dosage}{it.frequency ? ` • ${it.frequency}` : ''}</p>}
                {it.duration && <p className="text-sm text-muted-foreground">⏱ {it.duration}</p>}
                {it.instructions && <p className="text-xs text-muted-foreground italic">"{it.instructions}"</p>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {presc.notes && (
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Observações</p>
          <p className="text-sm">{presc.notes}</p>
        </Card>
      )}

      {/* Pharmacy linkage */}
      <Card className="p-4 space-y-3 border-pharmacy/30">
        <div className="flex items-center gap-2">
          <Pill className="h-4 w-4 text-pharmacy" />
          <p className="font-semibold text-sm">Farmácia</p>
          {presc.pharmacy_confirmed_at && <Badge variant="outline" className="text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />Confirmada</Badge>}
        </div>
        {suggested && !presc.pharmacy_confirmed_at && (
          <p className="text-xs text-muted-foreground">O médico sugere: <span className="font-medium text-foreground">{suggested.name}</span>{suggested.city ? ` (${suggested.city})` : ''}. Podes confirmar ou trocar.</p>
        )}
        {isPatient && !expired ? (
          <>
            <Select value={chosenId} onValueChange={setChosenId}>
              <SelectTrigger><SelectValue placeholder="Escolhe uma farmácia" /></SelectTrigger>
              <SelectContent>
                {pharmacies.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}{p.city ? ` • ${p.city}` : ''}{p.id === presc.suggested_pharmacy_id ? ' (sugerida)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="w-full" onClick={confirmPharmacy} disabled={confirming || !chosenId}>
              {confirming ? 'A confirmar...' : presc.chosen_pharmacy_id ? 'Atualizar farmácia' : 'Confirmar farmácia'}
            </Button>
          </>
        ) : (
          chosen ? <p className="text-sm">{chosen.name}{chosen.city ? ` • ${chosen.city}` : ''}</p>
                 : <p className="text-xs text-muted-foreground">Sem farmácia escolhida ainda.</p>
        )}
      </Card>

      {!expired && (
        <Button
          className="w-full h-12 bg-pharmacy hover:bg-pharmacy/90 text-pharmacy-foreground"
          onClick={() => navigate('/pharmacy', { state: { prescription_id: presc.id, pharmacy_id: chosenId || presc.suggested_pharmacy_id, priority: true } })}
        >
          <Zap className="h-5 w-5 mr-2" />
          Pedir nas farmácias (Prioritário)
        </Button>
      )}

      <Button variant="outline" className="w-full" onClick={downloadPdf}>
        <Download className="h-4 w-4 mr-2" /> Descarregar PDF
      </Button>

      <Button variant="outline" className="w-full" onClick={sharePdf}>
        <Share2 className="h-4 w-4 mr-2" /> Partilhar (WhatsApp / SMS)
      </Button>
    </div>
  );
}