import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Download, AlertTriangle } from 'lucide-react';

// Cidades por província (principais + algumas secundárias)
// Cobertura máxima: todos os distritos + principais vilas das 11 províncias de Moçambique
const MZ_CITIES: Record<string, string[]> = {
  'Maputo Cidade':    ['Maputo', 'KaMpfumo', 'Nlhamankulu', 'KaMaxaquene', 'KaMavota', 'KaMubukwana', 'KaTembe', 'KaNyaka'],
  'Maputo Província': ['Matola', 'Boane', 'Namaacha', 'Manhiça', 'Marracuene', 'Magude', 'Moamba', 'Ressano Garcia', 'Xinavane', 'Machava', 'Ndlavela'],
  'Gaza':             ['Xai-Xai', 'Chókwe', 'Manjacaze', 'Bilene', 'Chibuto', 'Guijá', 'Chigubo', 'Massangena', 'Massingir', 'Mabalane', 'Chicualacuala', 'Mapai', 'Praia do Bilene', 'Macia'],
  'Inhambane':        ['Inhambane', 'Maxixe', 'Vilanculos', 'Massinga', 'Inharrime', 'Homoíne', 'Jangamo', 'Panda', 'Funhalouro', 'Mabote', 'Govuro', 'Morrumbene', 'Zavala', 'Quissico', 'Inhassoro', 'Tofo'],
  'Sofala':           ['Beira', 'Dondo', 'Nhamatanda', 'Marromeu', 'Búzi', 'Caia', 'Chemba', 'Cheringoma', 'Chibabava', 'Gorongosa', 'Machanga', 'Maríngue', 'Muanza', 'Inhaminga'],
  'Manica':           ['Chimoio', 'Manica', 'Sussundenga', 'Gondola', 'Catandica', 'Bárue', 'Guro', 'Machaze', 'Macossa', 'Mossurize', 'Tambara', 'Espungabera', 'Vanduzi'],
  'Tete':             ['Tete', 'Moatize', 'Angónia', 'Ulónguè', 'Cahora Bassa', 'Songo', 'Changara', 'Chifunde', 'Chiúta', 'Macanga', 'Magoé', 'Marara', 'Mágoè', 'Mutarara', 'Zumbo', 'Doa', 'Furancungo'],
  'Zambézia':         ['Quelimane', 'Mocuba', 'Milange', 'Gurué', 'Alto Molócuè', 'Chinde', 'Derre', 'Gilé', 'Ile', 'Inhassunge', 'Luabo', 'Lugela', 'Maganja da Costa', 'Molumbo', 'Mopeia', 'Morrumbala', 'Namacurra', 'Namarrói', 'Nicoadala', 'Pebane'],
  'Nampula':          ['Nampula', 'Nacala', 'Angoche', 'Ilha de Moçambique', 'Monapo', 'Erati', 'Lalaua', 'Malema', 'Meconta', 'Mecubúri', 'Memba', 'Mogincual', 'Mogovolas', 'Moma', 'Mossuril', 'Muecate', 'Murrupula', 'Nacala-a-Velha', 'Nacaroa', 'Rapale', 'Ribáuè', 'Nametil'],
  'Cabo Delgado':     ['Pemba', 'Mocímboa da Praia', 'Montepuez', 'Chiúre', 'Mueda', 'Ancuabe', 'Balama', 'Ibo', 'Macomia', 'Mecúfi', 'Meluco', 'Metuge', 'Muidumbe', 'Namuno', 'Nangade', 'Palma', 'Quissanga'],
  'Niassa':           ['Lichinga', 'Cuamba', 'Marrupa', 'Mandimba', 'Metangula', 'Chimbunila', 'Lago', 'Majune', 'Maúa', 'Mavago', 'Mecanhelas', 'Mecula', 'Muembe', 'N\'gauma', 'Nipepe', 'Sanga'],
};

const TYPES = ['pharmacy', 'hospital', 'clinic', 'laboratory', 'veterinary'] as const;

export default function AdminMzImporter() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ city: string; done: number; total: number } | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [reset, setReset] = useState(true);

  const cities = Object.values(MZ_CITIES).flat();

  const addLog = (s: string) => setLog((prev) => [...prev, s].slice(-100));

  const run = async () => {
    if (running) return;
    if (!confirm(`Confirmar? ${reset ? 'Isto vai APAGAR todas as instituições MZ existentes.' : ''} Vai importar ~${cities.length} cidades × 5 tipos do Google Maps. Pode demorar 5-10 min.`)) return;
    setRunning(true);
    setLog([]);
    let doneCities = 0;

    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];
      setProgress({ city, done: i, total: cities.length });
      addLog(`→ ${city}...`);
      try {
        const { data, error } = await supabase.functions.invoke('seed-mz-google', {
          body: { city, types: TYPES, reset: reset && i === 0 },
        });
        if (error) throw error;
        const s = data?.summary || {};
        const totalInserted = Object.values(s).reduce((a: number, b: any) => a + (b.inserted || 0), 0);
        addLog(`✓ ${city}: ${totalInserted} instituições`);
        doneCities++;
      } catch (e: any) {
        addLog(`✗ ${city}: ${e.message}`);
      }
    }

    setProgress({ city: 'Concluído', done: cities.length, total: cities.length });
    setRunning(false);
    toast.success(`Importação concluída: ${doneCities}/${cities.length} cidades`);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Importador Moçambique (Google Maps)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30 text-sm flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              Vai buscar farmácias, hospitais, clínicas, laboratórios e veterinárias
              via Google Places em <strong>{cities.length} cidades</strong> das 11 províncias de Moçambique.
              Estimativa: 5–10 minutos, ~2000–4000 instituições.
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={reset} onChange={(e) => setReset(e.target.checked)} disabled={running} />
            Apagar todos os dados MZ atuais antes de importar (recomendado)
          </label>

          <Button onClick={run} disabled={running} size="lg" className="w-full">
            {running ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A importar…</>) : 'Iniciar importação'}
          </Button>

          {progress && (
            <div className="text-sm">
              <div className="flex justify-between mb-1">
                <span>Progresso</span>
                <Badge>{progress.done}/{progress.total}</Badge>
              </div>
              <div className="w-full h-2 bg-muted rounded overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Atual: {progress.city}</div>
            </div>
          )}

          {log.length > 0 && (
            <div className="max-h-64 overflow-auto rounded border bg-muted/30 p-2 text-xs font-mono space-y-0.5">
              {log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <strong>Províncias cobertas:</strong> {Object.keys(MZ_CITIES).join(', ')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}