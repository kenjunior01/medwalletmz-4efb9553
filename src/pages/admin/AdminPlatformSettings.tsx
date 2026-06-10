import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';

const FIELDS = [
  { key: 'default_commission_percent', label: 'Comissão padrão da plataforma (%)', type: 'number' },
  { key: 'deposit_bonus_percent', label: 'Bónus de depósito (%)', type: 'number' },
  { key: 'min_deposit_mzn', label: 'Depósito mínimo (MZN)', type: 'number' },
  { key: 'referral_bonus_mzn', label: 'Bónus em MZN ao convidar', type: 'number' },
  { key: 'referral_bonus_coins', label: 'Bónus em Joy Coins ao convidar', type: 'number' },
  { key: 'referral_referred_coins', label: 'Joy Coins para o convidado', type: 'number' },
  { key: 'wallet_required_for_services', label: 'Carteira obrigatória para pagar serviços', type: 'bool' },
];

export default function AdminPlatformSettings() {
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('platform_settings').select('key, value');
      const map: Record<string, any> = {};
      (data || []).forEach((r: any) => { map[r.key] = r.value; });
      setValues(map); setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const updates = Object.entries(values).map(([key, value]) => ({ key, value }));
    for (const u of updates) {
      await supabase.from('platform_settings').upsert(u, { onConflict: 'key' });
    }
    setSaving(false);
    toast.success('Configurações salvas');
  };

  if (loading) return <div className="p-8">A carregar...</div>;

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Carteira & Comissões — Definições</h1>
          <p className="text-sm text-muted-foreground">Parâmetros globais aplicados a toda a plataforma.</p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Parâmetros</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {FIELDS.map(f => (
            <div key={f.key} className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg">
              <Label className="text-sm flex-1">{f.label}</Label>
              {f.type === 'bool' ? (
                <Switch checked={!!values[f.key]} onCheckedChange={v => setValues({ ...values, [f.key]: v })} />
              ) : (
                <Input type="number" className="w-32" value={values[f.key] ?? ''}
                  onChange={e => setValues({ ...values, [f.key]: parseFloat(e.target.value) })} />
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
