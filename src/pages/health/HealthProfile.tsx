import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function HealthProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date_of_birth: '',
    gender: '',
    blood_type: '',
    allergies: '',
    chronic_conditions: '',
    current_medications: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.from('patient_profiles').select('*').eq('user_id', user.id).maybeSingle();
        if (cancelled) return;
        if (data) {
          setForm({
            date_of_birth: data.date_of_birth || '',
            gender: data.gender || '',
            blood_type: data.blood_type || '',
            allergies: (data.allergies || []).join(', '),
            chronic_conditions: (data.chronic_conditions || []).join(', '),
            current_medications: (data.current_medications || []).join(', '),
            emergency_contact_name: data.emergency_contact_name || '',
            emergency_contact_phone: data.emergency_contact_phone || '',
          });
        }
      } catch { /* noop */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      blood_type: form.blood_type || null,
      allergies: form.allergies.split(',').map(s => s.trim()).filter(Boolean),
      chronic_conditions: form.chronic_conditions.split(',').map(s => s.trim()).filter(Boolean),
      current_medications: form.current_medications.split(',').map(s => s.trim()).filter(Boolean),
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
    };
    const { error } = await supabase.from('patient_profiles').upsert(payload, { onConflict: 'user_id' });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Perfil de saúde guardado');
  };

  // Skeleton loading profissional (substitui "A carregar..." textual)
  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        </header>
        <div className="p-4 space-y-4 max-w-xl mx-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              <div className="h-10 rounded-md bg-muted animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              <div className="h-10 rounded-md bg-muted animate-pulse" />
            </div>
          </div>
          {[1,2,3].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-32 rounded bg-muted animate-pulse" />
              <div className="h-20 rounded-md bg-muted animate-pulse" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              <div className="h-10 rounded-md bg-muted animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              <div className="h-10 rounded-md bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="font-bold">Perfil de saúde</h1>
      </header>
      <div className="p-4 space-y-4 max-w-xl mx-auto">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Data de nascimento</Label><Input type="date" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} /></div>
          <div><Label>Sexo</Label><Input placeholder="M / F / Outro" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} /></div>
        </div>
        <div><Label>Tipo sanguíneo</Label><Input placeholder="A+, O-, ..." value={form.blood_type} onChange={e => setForm({...form, blood_type: e.target.value})} /></div>
        <div><Label>Alergias (separadas por vírgula)</Label><Textarea value={form.allergies} onChange={e => setForm({...form, allergies: e.target.value})} /></div>
        <div><Label>Doenças crónicas</Label><Textarea value={form.chronic_conditions} onChange={e => setForm({...form, chronic_conditions: e.target.value})} /></div>
        <div><Label>Medicamentos actuais</Label><Textarea value={form.current_medications} onChange={e => setForm({...form, current_medications: e.target.value})} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Contacto emergência</Label><Input value={form.emergency_contact_name} onChange={e => setForm({...form, emergency_contact_name: e.target.value})} /></div>
          <div><Label>Telefone</Label><Input value={form.emergency_contact_phone} onChange={e => setForm({...form, emergency_contact_phone: e.target.value})} /></div>
        </div>
      </div>
      <div className="fixed bottom-16 md:bottom-4 inset-x-0 p-4 bg-background border-t z-30">
        <Button className="w-full" size="lg" onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Guardar
        </Button>
      </div>
    </div>
  );
}