import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FlaskConical, ArrowLeft, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { LicenseUpload } from '@/components/upload/LicenseUpload';

export default function LabRegister() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: '', description: '', address: '', city: 'Maputo',
    phone: '', email: '', license_url: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user) return navigate('/auth');
    if (!form.name) return toast.error('Nome do laboratório obrigatório');
    if (!form.license_url) return toast.error('Carrega a licença MISAU');
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('clinics')
        .insert({ ...form, type: 'laboratory', owner_id: user.id, is_verified: false, is_active: false });
      if (error) throw error;
      await (supabase as any).from('user_roles').insert({ user_id: user.id, role: 'clinic' });
      toast.success('Laboratório submetido! Aguarda aprovação MedWallet.');
      navigate('/lab/dashboard');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 py-3 backdrop-blur border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Registar Laboratório</h1>
      </header>
      <section className="p-4 space-y-4 max-w-xl mx-auto">
        <Card className="p-5 bg-gradient-to-br from-cyan-500/10 to-primary/10 border-none">
          <FlaskConical className="h-8 w-8 text-cyan-600 dark:text-cyan-400 mb-2" />
          <h2 className="font-bold text-lg">Portal de Laboratórios</h2>
          <p className="text-sm text-muted-foreground">
            Recebe pedidos de exames, publica resultados PDF e recebe direto na carteira.
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Aprovação manual pela equipa MedWallet
          </div>
        </Card>

        <div className="space-y-3">
          <div>
            <Label>Nome do laboratório</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Descrição / especialidades</Label>
            <Textarea rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Análises clínicas, imagiologia, testes rápidos…" />
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
            <Label>Endereço</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <Label>Email de contacto</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <LicenseUpload
            label="Licença MISAU"
            description="Documento que autoriza a operação do laboratório"
            slot="misau-lab"
            value={form.license_url}
            onUploaded={(url) => setForm({ ...form, license_url: url })}
          />
          <Button className="w-full" disabled={saving} onClick={submit}>
            {saving ? 'A submeter…' : 'Submeter para aprovação'}
          </Button>
        </div>
      </section>
    </div>
  );
}