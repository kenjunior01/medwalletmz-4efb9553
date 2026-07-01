import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, Upload, Sparkles, MapPin, Info, ArrowRight, History } from 'lucide-react';
import { toast } from 'sonner';

type EntityKey = 'pharmacies' | 'clinics' | 'hospitals' | 'doctors';

const TEMPLATES: Record<EntityKey, { table: string; sample: Record<string, any>; required: string[]; notes: string }> = {
  pharmacies: {
    table: 'stores',
    required: ['name', 'city'],
    notes: 'Tipo é fixado como "pharmacy". image_url deve ser link público (PNG/JPG). lat/lng decimais (ex: -25.9692).',
    sample: { name: 'Farmácia Central', city: 'Maputo', address: 'Av. 24 de Julho 123', description: 'Aberta 24h', image_url: 'https://...png', latitude: -25.9692, longitude: 32.5732, delivery_fee: 50, delivery_time: '30-45 min', phone: '+258840000000' },
  },
  clinics: {
    table: 'clinics',
    required: ['name', 'city'],
    notes: 'logo_url deve ser link público. owner_id é preenchido com o admin atual.',
    sample: { name: 'Clínica Saúde+', city: 'Maputo', address: 'Av. Eduardo Mondlane', phone: '+258840000000', email: 'info@clinica.mz', description: 'Clínica geral', logo_url: 'https://...png', latitude: -25.9692, longitude: 32.5732 },
  },
  hospitals: {
    table: 'clinics',
    required: ['name', 'city'],
    notes: 'Hospitais usam a mesma tabela que clínicas; description deve indicar "Hospital".',
    sample: { name: 'Hospital Central de Maputo', city: 'Maputo', address: 'Av. Eduardo Mondlane', phone: '+258840000000', email: 'info@hcm.mz', description: 'Hospital', logo_url: 'https://...png', latitude: -25.9692, longitude: 32.5732 },
  },
  doctors: {
    table: 'doctor_profiles',
    required: ['user_id', 'license_number', 'consultation_fee'],
    notes: 'user_id deve ser um UUID de utilizador existente. languages separadas por vírgula.',
    sample: { user_id: 'uuid-do-utilizador', license_number: 'CRM-12345', consultation_fee: 1500, years_experience: 5, bio: 'Especialista em clínica geral', languages: 'pt,en', avatar_url: 'https://...png', latitude: -25.9692, longitude: 32.5732 },
  },
};

function downloadTemplate(key: EntityKey) {
  const tpl = TEMPLATES[key];
  const ws = XLSX.utils.json_to_sheet([tpl.sample]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, key);
  XLSX.writeFile(wb, `medwallet-${key}-template.xlsx`);
}

export default function AdminImport() {
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [cities, setCities] = useState('Maputo,Matola,Beira,Nampula,Quelimane,Tete,Chimoio,Xai-Xai,Pemba,Inhambane,Lichinga');

  const handleUpload = async (key: EntityKey, file: File) => {
    setBusy(key);
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });
      if (!rows.length) throw new Error('Ficheiro vazio');

      const tpl = TEMPLATES[key];
      let created = 0, failed = 0;
      const errors: string[] = [];

      const userResp = await supabase.auth.getUser();
      const adminId = userResp.data.user?.id;

      for (const row of rows) {
        const missing = tpl.required.filter((f) => !row[f]);
        if (missing.length) { failed++; errors.push(`${row.name || 'linha'}: faltam ${missing.join(', ')}`); continue; }

        let payload: any = { ...row };
        if (key === 'pharmacies') payload = { ...payload, type: 'pharmacy', is_active: true };
        if (key === 'clinics' || key === 'hospitals') {
          payload = { ...payload, owner_id: payload.owner_id || adminId, is_active: true, is_verified: false };
          if (key === 'hospitals' && !payload.description) payload.description = 'Hospital';
        }
        if (key === 'doctors' && typeof payload.languages === 'string') {
          payload.languages = payload.languages.split(',').map((s: string) => s.trim()).filter(Boolean);
        }

        const { error } = await (supabase.from(tpl.table as any) as any).insert(payload);
        if (error) { failed++; errors.push(`${row.name || row.user_id}: ${error.message}`); } else created++;
      }

      setResult({ created, failed, errors: errors.slice(0, 10), total: rows.length });
      toast.success(`${created} criados, ${failed} com erro`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const handleAutoImport = async () => {
    setBusy('auto');
    setResult(null);
    try {
      const cityList = cities.split(',').map((s) => s.trim()).filter(Boolean);
      // mode: 'draft' (default) coloca em place_proposals para curadoria.
      // muda para 'commit' se quiseres publicar direto (legacy).
      const { data, error } = await supabase.functions.invoke('import-places', {
        body: { cities: cityList, entities: ['pharmacy', 'clinic', 'hospital', 'laboratory'], mode: 'draft' },
      });
      if (error) throw error;
      setResult(data);
      const proposed = data?.proposed ?? 0;
      const stores = data?.createdStores ?? 0;
      const clinics = data?.createdClinics ?? 0;
      const skipped = data?.skipped ?? 0;
      const mode = data?.mode ?? 'draft';
      if (mode === 'draft') {
        toast.success(`Importação concluída — ${proposed} proposta(s) em rascunhos (${skipped} duplicadas)`);
      } else {
        toast.success(`Importação concluída: ${stores} farmácias, ${clinics} clínicas/hospitais`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro na importação');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Importar Dados</h1>
        <p className="text-muted-foreground">Importação em massa via Excel ou auto-importação via Google Maps.</p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Auto-importar via Google Maps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Procura farmácias, clínicas, hospitais e laboratórios no Google Places nas cidades indicadas.
            Itens vão para <strong>rascunhos curados</strong> — revê e aprova em <Link to="/admin/curation" className="text-primary underline font-semibold">/admin/curation</Link> antes de publicar.
            Itens duplicados (mesmo nome + cidade ou mesmo external_id) são ignorados.
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>Cidades (separadas por vírgula)</Label>
              <Input value={cities} onChange={(e) => setCities(e.target.value)} placeholder="Maputo, Beira, Nampula" />
            </div>
            <Button onClick={handleAutoImport} disabled={busy === 'auto'}>
              <MapPin className="h-4 w-4 mr-2" />
              {busy === 'auto' ? 'A importar...' : 'Importar agora'}
            </Button>
          </div>

          {result && (
            <Alert className="bg-secondary/10 border-secondary/30 mt-2">
              <History className="h-4 w-4 text-secondary" />
              <AlertTitle className="text-sm">Importação concluída</AlertTitle>
              <AlertDescription className="text-xs">
                <strong>{result.proposed ?? 0}</strong> proposta(s) novas em rascunhos ·{' '}
                <strong>{result.skipped ?? 0}</strong> já existente(s) (deduplicado).
                <Link to="/admin/curation" className="inline-flex items-center gap-1 ml-2 text-primary font-semibold underline">
                  Ir para a curadoria <ArrowRight className="h-3 w-3" />
                </Link>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Importar via Excel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Formato</AlertTitle>
            <AlertDescription className="text-sm">
              Faça download do template, preencha as linhas e carregue o ficheiro <code>.xlsx</code>.
              Para imagens, use um link público (PNG/JPG) — recomendado fazer upload no Supabase Storage primeiro.
              Coordenadas em formato decimal (ex.: <code>-25.9692</code>, <code>32.5732</code>).
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="pharmacies">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="pharmacies">Farmácias</TabsTrigger>
              <TabsTrigger value="clinics">Clínicas</TabsTrigger>
              <TabsTrigger value="hospitals">Hospitais</TabsTrigger>
              <TabsTrigger value="doctors">Médicos</TabsTrigger>
            </TabsList>

            {(Object.keys(TEMPLATES) as EntityKey[]).map((key) => {
              const tpl = TEMPLATES[key];
              return (
                <TabsContent key={key} value={key} className="space-y-4 pt-4">
                  <div className="text-sm space-y-2">
                    <p className="text-muted-foreground">{tpl.notes}</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-muted-foreground mr-2">Obrigatórios:</span>
                      {tpl.required.map((f) => (
                        <Badge key={f} variant="secondary">{f}</Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-muted-foreground mr-2">Colunas:</span>
                      {Object.keys(tpl.sample).map((f) => (
                        <Badge key={f} variant="outline">{f}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => downloadTemplate(key)}>
                      <Download className="h-4 w-4 mr-2" /> Baixar template
                    </Button>
                    <Label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        hidden
                        onChange={(e) => e.target.files?.[0] && handleUpload(key, e.target.files[0])}
                      />
                      <span className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium">
                        <Upload className="h-4 w-4" />
                        {busy === key ? 'A processar...' : 'Carregar Excel'}
                      </span>
                    </Label>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}