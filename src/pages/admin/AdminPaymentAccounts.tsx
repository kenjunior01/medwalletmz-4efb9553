import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPaymentAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState({
    method: 'mpesa',
    account_name: '',
    account_number: '',
    instructions: '',
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
    setForm({ method: 'mpesa', account_name: '', account_number: '', instructions: '' });
    load();
  };

  const toggle = async (id: string, is_active: boolean) => {
    await supabase.from('platform_payment_accounts').update({ is_active: !is_active }).eq('id', id);
    load();
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Contas de Recebimento</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Números M-Pesa, e-Mola, Mkesh ou bancários onde os utilizadores enviam pagamentos.
      </p>

      <Card className="p-4 mb-6 space-y-3">
        <h2 className="font-semibold">Adicionar conta</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Método</Label>
            <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="emola">e-Mola</SelectItem>
                <SelectItem value="mkesh">Mkesh</SelectItem>
                <SelectItem value="bank">Banco</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nome do titular</Label>
            <Input value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Número / IBAN</Label>
          <Input value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
        </div>
        <div>
          <Label>Instruções (opcional)</Label>
          <Textarea
            rows={2}
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            placeholder="Ex: Use o seu nome como referência."
          />
        </div>
        <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
      </Card>

      <div className="space-y-2">
        {accounts.map((a) => (
          <Card key={a.id} className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs uppercase text-muted-foreground">{a.method}</p>
              <p className="font-semibold">{a.account_name}</p>
              <p className="font-mono text-sm">{a.account_number}</p>
              {a.instructions && <p className="text-xs text-muted-foreground mt-1">{a.instructions}</p>}
            </div>
            <Switch checked={a.is_active} onCheckedChange={() => toggle(a.id, a.is_active)} />
          </Card>
        ))}
      </div>
    </div>
  );
}