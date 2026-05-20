import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Stethoscope, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DoctorRegister() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    license_number: '',
    specialty_id: '',
    bio: '',
    consultation_fee: '500',
    years_experience: '0',
  });

  useEffect(() => {
    supabase.from('medical_specialties').select('*').order('name').then(({ data }) => setSpecialties(data || []));
  }, []);

  const submit = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!form.license_number || !form.specialty_id || !form.full_name) {
      toast.error('Preencha os campos obrigatórios'); return;
    }
    setSaving(true);
    try {
      await supabase.from('profiles').update({ full_name: form.full_name, phone: form.phone }).eq('user_id', user.id);
      const { error: pErr } = await supabase.from('doctor_profiles').upsert({
        user_id: user.id,
        license_number: form.license_number,
        specialty_id: form.specialty_id,
        bio: form.bio,
        consultation_fee: parseInt(form.consultation_fee) || 500,
        years_experience: parseInt(form.years_experience) || 0,
        is_available: true,
      }, { onConflict: 'user_id' });
      if (pErr) throw pErr;
      await supabase.from('user_roles').upsert({ user_id: user.id, role: 'doctor' }, { onConflict: 'user_id,role' });
      toast.success('Registo enviado! A aguardar verificação.');
      navigate('/doctor/dashboard');
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="font-bold">Registo de médico</h1>
      </header>
      <div className="p-4 max-w-xl mx-auto space-y-4">
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-pharmacy/10 flex items-center justify-center mb-3">
            <Stethoscope className="h-8 w-8 text-pharmacy" />
          </div>
          <h2 className="text-xl font-bold">Junte-se ao MoçambiHealth</h2>
          <p className="text-sm text-muted-foreground">Atenda pacientes online por chat seguro</p>
        </div>

        <div><Label>Nome completo *</Label><Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} /></div>
        <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+258 84 ..." /></div>
        <div><Label>Nº de licença médica *</Label><Input value={form.license_number} onChange={e => setForm({...form, license_number: e.target.value})} /></div>
        <div>
          <Label>Especialidade *</Label>
          <Select value={form.specialty_id} onValueChange={v => setForm({...form, specialty_id: v})}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {specialties.map(s => <SelectItem key={s.id} value={s.id}>{s.icon} {s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Bio (apresentação ao paciente)</Label><Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} rows={3} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Preço da consulta (MZN)</Label><Input type="number" value={form.consultation_fee} onChange={e => setForm({...form, consultation_fee: e.target.value})} /></div>
          <div><Label>Anos de experiência</Label><Input type="number" value={form.years_experience} onChange={e => setForm({...form, years_experience: e.target.value})} /></div>
        </div>
        <p className="text-xs text-muted-foreground">A sua conta será verificada manualmente antes de aparecer publicamente.</p>
      </div>
      <div className="fixed bottom-0 inset-x-0 p-4 bg-background border-t">
        <Button className="w-full" size="lg" onClick={submit} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Submeter registo
        </Button>
      </div>
    </div>
  );
}