import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Palette, Percent, Globe, Save, Loader2, ArrowLeft, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate } from 'react-router-dom';
import { useCountry } from '@/contexts/CountryContext';

export default function CountrySettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { country: currentCountry } = useCountry();

  const [branding, setBranding] = useState<any>({
    primary_color: '#047857',
    secondary_color: '#064e3b',
    accent_color: '#fbbf24',
    home_banner_url: ''
  });

  const [commissions, setCommissions] = useState<any>({
    pharmacy: 10,
    doctor: 15,
    lab: 12,
    delivery: 5
  });

  const [compliance, setCompliance] = useState<any>({
    require_doctor_id: true,
    tax_name: 'IVA',
    tax_rate: 16,
    doctor_reg_name: 'Ordem'
  });

  const { data: countryData, isLoading } = useQuery({
    queryKey: ['my-country-settings', currentCountry?.id],
    enabled: !!currentCountry?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .eq('id', currentCountry!.id)
        .single();

      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (countryData) {
      if (countryData.branding_config) setBranding(countryData.branding_config);
      if (countryData.commission_rates) setCommissions(countryData.commission_rates);
      if (countryData.compliance_config) setCompliance(countryData.compliance_config);
    }
  }, [countryData]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('countries')
        .update({
          branding_config: branding,
          commission_rates: commissions,
          compliance_config: compliance
        })
        .eq('id', currentCountry!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-country-settings'] });
      queryClient.invalidateQueries({ queryKey: ['countries'] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (err: any) => {
      toast.error('Erro ao salvar: ' + err.message);
    }
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-black">Gestão do País</h1>
          <p className="text-muted-foreground">Personalize a MedWallet para {countryData?.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Branding */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" /> Branding & Estética
            </CardTitle>
            <CardDescription>Cores e imagens que os utilizadores verão no {countryData?.name}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cor Primária</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={branding.primary_color}
                  onChange={(e) => setBranding({...branding, primary_color: e.target.value})}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={branding.primary_color}
                  onChange={(e) => setBranding({...branding, primary_color: e.target.value})}
                  placeholder="#000000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor de Destaque (Accent)</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={branding.accent_color}
                  onChange={(e) => setBranding({...branding, accent_color: e.target.value})}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={branding.accent_color}
                  onChange={(e) => setBranding({...branding, accent_color: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Banner Principal (URL)
              </Label>
              <Input
                value={branding.home_banner_url || ''}
                onChange={(e) => setBranding({...branding, home_banner_url: e.target.value})}
                placeholder="https://exemplo.com/banner.jpg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Commissions */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-secondary" /> Taxas de Comissão (%)
            </CardTitle>
            <CardDescription>Defina quanto a plataforma retém por serviço neste país.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Farmácias (Vendas)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={commissions.pharmacy}
                  onChange={(e) => setCommissions({...commissions, pharmacy: Number(e.target.value)})}
                />
                <span className="font-bold">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Médicos (Consultas)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={commissions.doctor}
                  onChange={(e) => setCommissions({...commissions, doctor: Number(e.target.value)})}
                />
                <span className="font-bold">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Entregadores (Taxa de Serviço)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={commissions.delivery}
                  onChange={(e) => setCommissions({...commissions, delivery: Number(e.target.value)})}
                />
                <span className="font-bold">%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-500" /> Regras de Compliance
            </CardTitle>
            <CardDescription>Regras legais para operar em {countryData?.name}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="req-doc"
                checked={compliance.require_doctor_id}
                onCheckedChange={(val) => setCompliance({...compliance, require_doctor_id: !!val})}
              />
              <Label htmlFor="req-doc" className="text-xs">Exigir Registro Profissional (CRM/GMC/etc)</Label>
            </div>
            <div className="space-y-2">
              <Label>Nome do Imposto (ex: IVA, GST, ISS)</Label>
              <Input
                value={compliance.tax_name}
                onChange={(e) => setCompliance({...compliance, tax_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Taxa do Imposto (%)</Label>
              <Input
                type="number"
                value={compliance.tax_rate}
                onChange={(e) => setCompliance({...compliance, tax_rate: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome do Órgão Regulador Médico</Label>
              <Input
                value={compliance.doctor_reg_name}
                onChange={(e) => setCompliance({...compliance, doctor_reg_name: e.target.value})}
                placeholder="Ex: CRM, GMC, MCI"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Save Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="shadow-2xl gap-2 font-bold h-14 px-8 rounded-2xl"
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Guardar Todas as Alterações
        </Button>
      </div>
    </div>
  );
}
