import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, FileText, Upload, Share2, Trash2, Download, Sparkles, Scan, Search, Globe2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { detectText } from '@/lib/googleVision';

const typeLabel: Record<string, string> = {
  exam: 'Exame', report: 'Relatório', imaging: 'Imagem', lab: 'Laboratório', other: 'Outro',
};

export default function MedicalRecords() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', record_type: 'exam', description: '', issued_at: '', issued_by: '' });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);

  const exportFHIR = (record: any) => {
    // FHIR (Fast Healthcare Interoperability Resources) simulation
    const fhirResource = {
      resourceType: "DocumentReference",
      status: "current",
      type: { text: record.title },
      subject: { reference: `Patient/${user?.id}` },
      date: new Date().toISOString(),
      content: [{
        attachment: {
          contentType: record.file_mime || "application/pdf",
          url: record.file_url,
          title: record.title
        }
      }]
    };

    const blob = new Blob([JSON.stringify(fhirResource, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FHIR-${record.id}.json`;
    a.click();
    toast.success('Exportado no padrão global FHIR/HL7');
  };

  const runOCR = async () => {
    if (!file) return toast.error('Carrega um ficheiro primeiro');
    setScanning(true);

    try {
      const text = await detectText(file);
      setForm({
        ...form,
        title: 'Digitalização: ' + file.name.split('.')[0],
        issued_by: 'Extraído via Google Vision AI',
        description: text,
        issued_at: new Date().toISOString().split('T')[0]
      });
      toast.success('Documento processado com sucesso!');
    } catch (e) {
      toast.error('Erro ao processar documento');
    } finally {
      setScanning(false);
    }
  };

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('medical_records')
      .select('*, shares:medical_record_shares(id, doctor_id, revoked_at)')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false });
    setRecords(data ?? []);
  };

  useEffect(() => { load(); }, [user]);
  useEffect(() => {
    supabase
      .from('doctor_profiles')
      .select('user_id, specialty, profile:profiles!doctor_profiles_user_id_fkey(full_name)')
      .eq('is_verified', true)
      .then(({ data }) => setDoctors(data ?? []));
  }, []);

  const save = async () => {
    if (!user || !form.title) return toast.error('Indica um título');
    setSaving(true);
    try {
      let fileUrl: string | null = null;
      let fileMime: string | null = null;
      if (file) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from('medical-records').upload(path, file);
        if (upErr) throw upErr;
        fileUrl = path;
        fileMime = file.type;
      }
      const { error } = await supabase.from('medical_records').insert({
        patient_id: user.id,
        title: form.title,
        record_type: form.record_type,
        description: form.description || null,
        issued_at: form.issued_at || null,
        issued_by: form.issued_by || null,
        file_url: fileUrl,
        file_mime: fileMime,
      });
      if (error) throw error;
      toast.success('Registo adicionado');
      setOpen(false);
      setForm({ title: '', record_type: 'exam', description: '', issued_at: '', issued_by: '' });
      setFile(null);
      load();
    } catch (e: any) {
      toast.error(e.message ?? 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Apagar este registo?')) return;
    await supabase.from('medical_records').delete().eq('id', id);
    load();
  };

  const share = async (recordId: string, doctorId: string) => {
    if (!user) return;
    const { error } = await supabase.from('medical_record_shares').insert({
      record_id: recordId, patient_id: user.id, doctor_id: doctorId,
    });
    if (error) toast.error(error.message);
    else { toast.success('Partilhado com o médico'); setShareOpen(null); load(); }
  };

  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from('medical-records').createSignedUrl(path, 60);
    if (error || !data) return toast.error('Erro a abrir ficheiro');
    window.open(data.signedUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 py-3 backdrop-blur border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">Histórico Médico</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo registo</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Título *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Hemograma completo" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.record_type} onValueChange={(v) => setForm({ ...form, record_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={form.issued_at} onChange={(e) => setForm({ ...form, issued_at: e.target.value })} />
                </div>
                <div>
                  <Label>Emitido por</Label>
                  <Input value={form.issued_by} onChange={(e) => setForm({ ...form, issued_by: e.target.value })} placeholder="Hospital Central" />
                </div>
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>Ficheiro</Label>
                <div className="flex gap-2 mt-1">
                  <label className="flex-1 flex items-center gap-2 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-muted/50 overflow-hidden">
                    <Upload className="h-4 w-4 shrink-0" />
                    <span className="text-sm truncate">{file ? file.name : 'PDF / Imagem'}</span>
                    <input type="file" accept="image/*,application/pdf" className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  </label>
                  {file && (
                    <Button
                      variant="secondary"
                      onClick={runOCR}
                      disabled={scanning}
                      className="bg-accent/10 text-secondary border-accent/20"
                    >
                      {scanning ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Scan className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
                {scanning && <p className="text-[10px] text-secondary mt-1 animate-pulse">A extrair texto via Cloud Vision API...</p>}
              </div>
              <Button className="w-full" onClick={save} disabled={saving}>{saving ? 'A guardar...' : 'Guardar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
          Registos Protegidos · Compatível com padrão Global FHIR/HL7
        </p>
      </div>

      <section className="p-4 space-y-3">
        {records.length === 0 ? (
          <Card className="p-6 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="font-semibold">Sem registos ainda</p>
            <p className="text-sm text-muted-foreground mt-1">Adiciona exames e receitas para ter sempre à mão.</p>
          </Card>
        ) : records.map((r) => {
          const activeShares = (r.shares ?? []).filter((s: any) => !s.revoked_at).length;
          return (
            <Card key={r.id} className="p-4">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {typeLabel[r.record_type]} · {r.issued_at ? format(new Date(r.issued_at), 'dd/MM/yyyy') : '—'}
                  </p>
                  {r.issued_by && <p className="text-xs text-muted-foreground">{r.issued_by}</p>}
                </div>
                <Badge variant="outline">{activeShares} médico(s)</Badge>
              </div>
              {r.description && <p className="text-sm mt-2">{r.description}</p>}
              <div className="flex gap-2 mt-3 flex-wrap">
                {r.file_url && (
                  <Button size="sm" variant="outline" onClick={() => download(r.file_url)}>
                    <Download className="h-3 w-3 mr-1" /> Abrir
                  </Button>
                )}
                <Dialog open={shareOpen === r.id} onOpenChange={(o) => setShareOpen(o ? r.id : null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><Share2 className="h-3 w-3 mr-1" /> Partilhar</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Partilhar com médico</DialogTitle></DialogHeader>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {doctors.map((d) => (
                        <button key={d.user_id}
                          onClick={() => share(r.id, d.user_id)}
                          className="w-full text-left p-3 rounded border hover:bg-muted">
                          <p className="font-semibold text-sm">Dr(a). {d.profile?.full_name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{d.specialty}</p>
                        </button>
                      ))}
                      {doctors.length === 0 && <p className="text-sm text-muted-foreground">Sem médicos verificados.</p>}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button size="sm" variant="ghost" onClick={() => exportFHIR(r)} className="text-muted-foreground">
                  <Globe2 className="h-3 w-3 mr-1" /> FHIR
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(r.id)} className="text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          );
        })}
      </section>
    </div>
  );
}