import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Globe } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPaymentAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState({
    method: 'mpesa',
    account_name: '',
    account_number: '',
    instructions: '',
    country_id: 'MZ',
  });

  const load = async () => {
    const { data } = await supabase.from('platform_payment_accounts').select('*').order('created_at');
    setAccounts(data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!form.account_name || !form.account_number) {
      toast.error('Preencha nome e número');
      return;
    }
    const { error } = await supabase.from('platform_payment_accounts').insert(form);
    if (error) return toast.error(error.message);
    toast.success('Conta adicionada');
    setForm({ method: 'mpesa', account_name: '', account_number: '', instructions: '', country_id: 'MZ' });
    load();
  };

  const toggle = async (id: string, is_active: boolean) => {
    await supabase.from('platform_payment_accounts').update({ is_active: !is_active }).eq('id', id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Eliminar esta conta?')) return;
    await supabase.from('platform_payment_accounts').delete().eq('id', id);
    load();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" /> Contas de Recebimento
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure onde os utilizadores devem depositar fundos por região.
          </p>
        </div>
      </div>

      <Card className="p-6 mb-8 space-y-4">
        <h2 className="font-semibold text-lg">Adicionar Nova Conta</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>País / Região</Label>
            <Select value={form.country_id} onValueChange={(v) => setForm({ ...form, country_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MZ">Moçambique</SelectItem>
                <SelectItem value="AO">Angola</SelectItem>
                <SelectItem value="BR">Brasil</SelectItem>
                <SelectItem value="PT">Portugal</SelectItem>
                <SelectItem value="ZA">África do Sul</SelectItem>
                <SelectItem value="IN">Índia</SelectItem>
                <SelectItem value="US">Estados Unidos</SelectItem>
                <SelectItem value="GB">Inglaterra</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Método de Pagamento</Label>
            <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="emola">e-Mola</SelectItem>
                <SelectItem value="mkesh">Mkesh</SelectItem>
                <SelectItem value="bank">Transferência Bancária</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="stripe">Stripe / Card</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="upi">UPI (Índia)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nome do Titular</Label>
            <Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} placeholder="Ex: MedWallet Lda" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Número da Conta / IBAN / ID</Label>
            <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} placeholder="84... / IBAN / Email PayPal" />
          </div>
          <div className="space-y-2">
            <Label>Instruções Adicionais</Label>
            <Input value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="Ex: Anexe o comprovativo PDF" />
          </div>
        </div>

        <Button onClick={add} className="w-full md:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Adicionar Conta
        </Button>
      </Card>

      <div className="grid gap-4">
        {accounts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
            Nenhuma conta configurada.
          </div>
        ) : (
          accounts.map((a) => (
            <Card key={a.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {a.country_id}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs uppercase font-bold text-muted-foreground">{a.method}</p>
                    {!a.is_active && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Inativo</span>}
                  </div>
                  <p className="font-bold">{a.account_name}</p>
                  <p className="font-mono text-sm text-primary">{a.account_number}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{a.is_active ? 'Ativo' : 'Inativo'}</span>
                  <Switch checked={a.is_active} onCheckedChange={() => toggle(a.id, a.is_active)} />
                </div>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(a.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
