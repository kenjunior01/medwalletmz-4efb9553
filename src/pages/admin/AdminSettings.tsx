import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
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

// Platform settings (would normally be stored in a settings table)
const defaultSettings = {
  platformName: 'MoçambiApp',
  supportWhatsApp: '258841234567',
  supportEmail: 'suporte@mocambiapp.co.mz',
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
  currency: 'MZN'
};

export default function AdminSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate saving (in real app, save to Supabase settings table)
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Configurações salvas com sucesso!');
    setSaving(false);
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
              </div>
              <div className="space-y-2">
                <Label>Email Suporte</Label>
                <Input 
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => updateSetting('supportEmail', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cidade Padrão</Label>
              <Input 
                value={settings.defaultCity}
                onChange={(e) => updateSetting('defaultCity', e.target.value)}
              />
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
