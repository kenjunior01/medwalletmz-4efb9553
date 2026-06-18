import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { LicenseUpload } from '@/components/upload/LicenseUpload';

export default function ClinicRegister() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    city: 'Maputo',
    phone: '',
    email: '',
    license_url: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user) return navigate('/auth');
    if (!form.name) return toast.error('Nome da clínica obrigatório');
    if (!form.license_url) return toast.error('Carrega a licença MISAU');
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('clinics')
        .insert({ ...form, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;
      await supabase.from('user_roles').insert({ user_id: user.id, role: 'clinic' as any });
      toast.success('Clínica criada! Falta subscrever o plano.');
      navigate('/clinic/dashboard');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 py-3 backdrop-blur border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Registar Clínica</h1>
      </header>
      <section className="p-4 space-y-4 max-w-xl mx-auto">
        <Card className="p-5 bg-gradient-to-br from-pharmacy/10 to-primary/10 border-none">
          <Building2 className="h-8 w-8 text-pharmacy mb-2" />
          <h2 className="font-bold text-lg">Portal de Clínicas</h2>
          <p className="text-sm text-muted-foreground">Adicione médicos e gira agenda numa só conta.</p>
        </Card>

        <div className="space-y-3">
          <div>
            <Label>Nome da clínica</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cidade</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Morada</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <LicenseUpload
            slot="misau"
            label="Licença de funcionamento (MISAU) *"
            description="Foto ou PDF do alvará da clínica"
            value={form.license_url}
            onUploaded={(p) => setForm({ ...form, license_url: p })}
          />
        </div>
        <Button className="w-full" onClick={submit} disabled={saving}>
          {saving ? 'A guardar...' : 'Criar clínica'}
        </Button>
      </section>
    </div>
  );
}