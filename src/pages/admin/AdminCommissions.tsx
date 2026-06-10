import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Percent, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SERVICE_LABELS: Record<string, string> = {
  consultation: 'Consulta', prescription: 'Receita', pharmacy_order: 'Pedido Farmácia',
  delivery: 'Entrega', subscription: 'Subscrição',
};
const ROLE_LABELS: Record<string, string> = {
  doctor: 'Médico', clinic: 'Clínica', store_owner: 'Farmácia',
  driver: 'Entregador', customer: 'Cliente', admin: 'Admin',
};

export default function AdminCommissions() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ service_type: 'consultation', role: 'doctor', percentage: 10 });

  const { data } = useQuery({
    queryKey: ['service-commissions'],
    queryFn: async () => (await supabase.from('service_commissions').select('*').order('service_type')).data || [],
  });

  const upd = useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const { error } = await supabase.from('service_commissions').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-commissions'] }); toast.success('Atualizado'); },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('service_commissions').insert(form as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-commissions'] });
      toast.success('Comissão criada'); setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Comissões da Plataforma</h1>
          <p className="text-muted-foreground text-sm">% retida pela plataforma em cada serviço (por tipo de utilizador beneficiário).</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nova</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Tabela de comissões</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground py-2 border-b">
            <div className="col-span-4">Serviço</div>
            <div className="col-span-3">Beneficiário</div>
            <div className="col-span-3">% Comissão</div>
            <div className="col-span-2 text-right">Ativo</div>
          </div>
          {data?.map((c: any) => (
            <div key={c.id} className="grid grid-cols-12 gap-2 py-3 items-center border-b">
              <div className="col-span-4 font-medium">{SERVICE_LABELS[c.service_type] || c.service_type}</div>
              <div className="col-span-3 text-sm">{ROLE_LABELS[c.role] || c.role}</div>
              <div className="col-span-3 flex items-center gap-2">
                <Input type="number" defaultValue={c.percentage} className="h-8 w-20"
                  onBlur={e => {
                    const v = parseFloat(e.target.value);
                    if (v !== Number(c.percentage)) upd.mutate({ id: c.id, percentage: v });
                  }} />
                <Percent className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="col-span-2 flex justify-end">
                <Switch checked={c.is_active} onCheckedChange={(v) => upd.mutate({ id: c.id, is_active: v })} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova comissão</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm">Serviço</label>
              <Select value={form.service_type} onValueChange={v => setForm({ ...form, service_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(SERVICE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm">Tipo utilizador</label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ROLE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm">Percentagem</label>
              <Input type="number" value={form.percentage} onChange={e => setForm({ ...form, percentage: parseFloat(e.target.value) })} />
            </div>
            <Button className="w-full" onClick={() => create.mutate()}>Criar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
