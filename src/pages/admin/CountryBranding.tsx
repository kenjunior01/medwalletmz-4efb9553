import { useState, useEffect } from 'react';
import { useCountry } from '@/contexts/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { hexToHslComponents } from '@/lib/colors';

export default function CountryBranding() {
  const { country, reload } = useCountry();
  const [config, setConfig] = useState<any>({
    primary_color: '#047857',
    secondary_color: '#fbbf24',
    home_banner_url: ''
  });

  useEffect(() => {
    if (country?.branding_config) {
      setConfig(country.branding_config);
    }
  }, [country]);

  const save = async () => {
    try {
      if (!country?.id) return;

      const { error } = await supabase
        .from('countries' as any)
        .update({ branding_config: config } as any)
        .eq('id', country.id);

      if (error) throw error;

      toast.success("Identidade visual actualizada com sucesso!");

      // Update local styles correctly using HSL conversion
      if (config.primary_color) {
        document.documentElement.style.setProperty('--primary', hexToHslComponents(config.primary_color));
      }
      if (config.secondary_color) {
        document.documentElement.style.setProperty('--secondary', hexToHslComponents(config.secondary_color));
      }

      await reload();
    } catch (e: any) {
      toast.error("Erro ao guardar: " + e.message);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Customização Regional: {country?.name}</h1>

      <Card>
        <CardHeader><CardTitle>Cores da Marca</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cor Primária</Label>
              <div className="flex gap-2">
                <Input type="color" value={config.primary_color} onChange={e => setConfig({...config, primary_color: e.target.value})} className="w-12 p-1" />
                <Input value={config.primary_color} onChange={e => setConfig({...config, primary_color: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor de Destaque (Accent)</Label>
              <div className="flex gap-2">
                <Input type="color" value={config.secondary_color} onChange={e => setConfig({...config, secondary_color: e.target.value})} className="w-12 p-1" />
                <Input value={config.secondary_color} onChange={e => setConfig({...config, secondary_color: e.target.value})} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Imagens e Assets</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL do Banner da Home (Localizado)</Label>
            <Input
              placeholder="https://exemplo.com/banner-maputo.jpg"
              value={config.home_banner_url}
              onChange={e => setConfig({...config, home_banner_url: e.target.value})}
            />
            <p className="text-[10px] text-muted-foreground">Usa imagens que reflitam a cultura e população local.</p>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={save}>Aplicar Identidade na Região</Button>
    </div>
  );
}
