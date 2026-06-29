import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { z } from 'zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, 
  Bell, 
  Shield, 
  CreditCard, 
  Truck, 
  Store, 
  Globe, 
  Palette,
  Save,
  RefreshCw
} from 'lucide-react';

const defaultSettings = {
  platformName: 'MedWallet',
  supportWhatsApp: '258841234567',
  supportEmail: 'suporte@medwallet.co.mz',
  defaultDeliveryFee: 50,
  minOrderValue: 100,
  maxDeliveryRadius: 10,
  enableDriverAutoAssign: true,
  enableOrderNotifications: true,
  enablePromotions: true,
  maintenanceMode: false,
  allowNewStoreRegistrations: true,
  allowNewDriverRegistrations: true,
  defaultCity: 'Maputo',
  currency: 'MZN',
  nearby_radius_km: 25,
  nearby_ranking: 'distance' as 'distance' | 'rating' | 'price',
};

const settingsSchema = z.object({
  platformName: z.string().trim().min(2, 'Nome muito curto').max(60),
  supportWhatsApp: z.string().trim().regex(/^\d{9,15}$/, 'Apenas dígitos (9-15)'),
  supportEmail: z.string().trim().email('Email inválido').max(120),
  defaultDeliveryFee: z.number().min(0).max(10000),
  minOrderValue: z.number().min(0).max(100000),
  maxDeliveryRadius: z.number().min(1).max(200),
  nearby_radius_km: z.number().min(1, 'Raio mínimo 1 km').max(200, 'Raio máximo 200 km'),
  nearby_ranking: z.enum(['distance', 'rating', 'price']),
  defaultCity: z.string().trim().min(2).max(40),
});

export default function AdminSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('platform_settings').select('key, value');
      if (data && data.length) {
        const loaded: any = { ...defaultSettings };
        data.forEach((r: any) => {
          if (r.key in defaultSettings) {
            const v = r.value;
            let parsed: any = v;
            if (typeof v === 'string') {
              const s = v.replace(/^"|"$/g, '');
              if (s === 'true') parsed = true;
              else if (s === 'false') parsed = false;
              else if (!Number.isNaN(Number(s)) && s.trim() !== '' && typeof (defaultSettings as any)[r.key] === 'number') parsed = Number(s);
              else parsed = s;
            }
            loaded[r.key] = parsed;
          }
        });
        setSettings(loaded);
      }
      setLoading(false);
    })();

    // Realtime: refresh on remote changes
    const ch = supabase.channel('admin-settings-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings' }, async () => {
        const { data } = await supabase.from('platform_settings').select('key, value');
        if (!data) return;
        const loaded: any = { ...defaultSettings };
        data.forEach((r: any) => {
          if (r.key in defaultSettings) {
            const v = r.value;
            let parsed: any = v;
            if (typeof v === 'string') {
              const s = v.replace(/^"|"$/g, '');
              if (s === 'true') parsed = true;
              else if (s === 'false') parsed = false;
              else if (!Number.isNaN(Number(s)) && s.trim() !== '' && typeof (defaultSettings as any)[r.key] === 'number') parsed = Number(s);
              else parsed = s;
            }
            loaded[r.key] = parsed;
          }
        });
        setSettings(loaded);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleSave = async () => {
    const parsed = settingsSchema.safeParse(settings);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach(i => { fe[i.path[0] as string] = i.message; });
      setErrors(fe);
      toast.error('Corrige os campos destacados antes de guardar');
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const rows = Object.entries(settings).map(([key, value]) => ({
        key,
        value: value as any,
      }));
      const { error } = await supabase.from('platform_settings').upsert(rows, { onConflict: 'key' });
      if (error) throw error;
      toast.success('Configurações guardadas');
    } catch (e: any) {
      toast.error('Erro ao guardar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof typeof defaultSettings>(
    key: K, 
    value: typeof defaultSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Configurações gerais da plataforma</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Alterações
        </Button>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Geral
            </CardTitle>
            <CardDescription>Informações básicas da plataforma</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Plataforma</Label>
                <Input 
                  value={settings.platformName}
                  onChange={(e) => updateSetting('platformName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Moeda</Label>
                <Input 
                  value={settings.currency}
                  onChange={(e) => updateSetting('currency', e.target.value)}
                  disabled
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>WhatsApp Suporte</Label>
                <Input 
                  value={settings.supportWhatsApp}
                  onChange={(e) => updateSetting('supportWhatsApp', e.target.value)}
                  placeholder="258xxxxxxxxx"
                />
                {errors.supportWhatsApp && <p className="text-xs text-destructive">{errors.supportWhatsApp}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email Suporte</Label>
                <Input 
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => updateSetting('supportEmail', e.target.value)}
                />
                {errors.supportEmail && <p className="text-xs text-destructive">{errors.supportEmail}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cidade Padrão</Label>
              <Input 
                value={settings.defaultCity}
                onChange={(e) => updateSetting('defaultCity', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label>Raio máximo "Perto de ti" (km)</Label>
                <Input
                  type="number" min={1} max={200}
                  value={settings.nearby_radius_km}
                  onChange={(e) => updateSetting('nearby_radius_km', parseInt(e.target.value) || 0)}
                />
                {errors.nearby_radius_km && <p className="text-xs text-destructive">{errors.nearby_radius_km}</p>}
              </div>
              <div className="space-y-2">
                <Label>Método de ranking de prestadores</Label>
                <Select
                  value={settings.nearby_ranking}
                  onValueChange={(v) => updateSetting('nearby_ranking', v as any)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distance">Distância (mais perto primeiro)</SelectItem>
                    <SelectItem value="rating">Avaliação (melhor primeiro)</SelectItem>
                    <SelectItem value="price">Preço (mais barato primeiro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Entregas
            </CardTitle>
            <CardDescription>Configurações de entrega</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Taxa de Entrega Padrão (MZN)</Label>
                <Input 
                  type="number"
                  value={settings.defaultDeliveryFee}
                  onChange={(e) => updateSetting('defaultDeliveryFee', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Pedido Mínimo (MZN)</Label>
                <Input 
                  type="number"
                  value={settings.minOrderValue}
                  onChange={(e) => updateSetting('minOrderValue', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Raio Máximo (km)</Label>
                <Input 
                  type="number"
                  value={settings.maxDeliveryRadius}
                  onChange={(e) => updateSetting('maxDeliveryRadius', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Atribuição Automática de Entregadores</p>
                <p className="text-sm text-muted-foreground">
                  Atribuir automaticamente pedidos aos entregadores disponíveis
                </p>
              </div>
              <Switch 
                checked={settings.enableDriverAutoAssign}
                onCheckedChange={(checked) => updateSetting('enableDriverAutoAssign', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Store Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Farmácias & Entregadores
            </CardTitle>
            <CardDescription>Controle de registos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Permitir Registo de Novas Farmácias</p>
                <p className="text-sm text-muted-foreground">
                  Novos lojistas podem se registrar na plataforma
                </p>
              </div>
              <Switch 
                checked={settings.allowNewStoreRegistrations}
                onCheckedChange={(checked) => updateSetting('allowNewStoreRegistrations', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Permitir Registo de Novos Entregadores</p>
                <p className="text-sm text-muted-foreground">
                  Novos entregadores podem se registrar na plataforma
                </p>
              </div>
              <Switch 
                checked={settings.allowNewDriverRegistrations}
                onCheckedChange={(checked) => updateSetting('allowNewDriverRegistrations', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
            </CardTitle>
            <CardDescription>Configurações de notificações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Notificações de Pedidos</p>
                <p className="text-sm text-muted-foreground">
                  Enviar notificações sobre status de pedidos
                </p>
              </div>
              <Switch 
                checked={settings.enableOrderNotifications}
                onCheckedChange={(checked) => updateSetting('enableOrderNotifications', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Promoções e Marketing</p>
                <p className="text-sm text-muted-foreground">
                  Enviar notificações promocionais aos clientes
                </p>
              </div>
              <Switch 
                checked={settings.enablePromotions}
                onCheckedChange={(checked) => updateSetting('enablePromotions', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Mode */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-5 w-5" />
              Modo de Manutenção
            </CardTitle>
            <CardDescription>Configurações de emergência</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <div>
                <p className="font-medium">Ativar Modo de Manutenção</p>
                <p className="text-sm text-muted-foreground">
                  A plataforma ficará indisponível para os utilizadores
                </p>
              </div>
              <Switch 
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => updateSetting('maintenanceMode', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Pagamentos</p>
                  <p className="text-sm text-muted-foreground">M-Pesa, e-Mola, Mkesh</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Status</p>
                  <p className="text-sm text-green-600">Plataforma Online</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
