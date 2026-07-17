import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  useEffect(() => { load(); }, []);

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

  return (
    <div className="p-6 max-w-4xl mx-auto pb-24">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Globe className="text-primary" /> Contas de Recebimento
      </h1>

      <Card className="p-6 mb-8 space-y-4">
        <h2 className="font-semibold">Nova Conta Regional</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>País</Label>
            <Select value={form.country_id} onValueChange={(v) => setForm({ ...form, country_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MZ">Moçambique</SelectItem>
                <SelectItem value="AO">Angola</SelectItem>
                <SelectItem value="BR">Brasil</SelectItem>
                <SelectItem value="PT">Portugal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Método</Label>
            <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="bank">Banco</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Titular</Label>
            <Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Número / ID / IBAN</Label>
          <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
        </div>
        <Button onClick={add} className="w-full md:w-auto"><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
      </Card>

      <div className="grid gap-3">
        {accounts.map((a) => (
          <Card key={a.id} className="p-4 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">{a.country_id} • {a.method}</p>
              <p className="font-bold">{a.account_name}</p>
              <p className="text-sm font-mono">{a.account_number}</p>
            </div>
            <Switch checked={a.is_active} onCheckedChange={() => toggle(a.id, a.is_active)} />
          </Card>
        ))}
      </div>
    </div>
  );
}
