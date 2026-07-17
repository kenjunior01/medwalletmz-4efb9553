import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCountry } from '@/contexts/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Globe, Upload, CheckCircle2, AlertTriangle,
  ArrowLeft, Building2, Store, FlaskConical,
  Database, ShieldCheck, Zap, Network, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Regional Onboarding Page - Strategic Recommendation §3.1
 * Specifically for Country/Regional Managers to onboard networks of health units.
 */
export default function RegionalOnboarding() {
  const navigate = useNavigate();
  const { country } = useCountry();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fhirMapping, setFhirMapping] = useState<any[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      // Simulate FHIR Mapping extraction
      setFhirMapping([
        { source: 'Nome da Unidade', fhir: 'Organization.name', status: 'valid' },
        { source: 'Cidade / Região', fhir: 'Location.address.city', status: 'valid' },
        { source: 'Nº Licença MISAU', fhir: 'Organization.identifier', status: 'valid' },
        { source: 'Coordenadas GPS', fhir: 'Location.position', status: 'warning' },
      ]);
    }
  };

  const startImport = async () => {
    if (!file) return;
    setUploading(true);

    // Simulação da Cloud Function e Healthcare API
    await new Promise(r => setTimeout(r, 3000));

    setUploading(false);
    setStep(3);
    toast.success(`Rede em ${country?.name} importada com sucesso via FHIR Gateway!`);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-black flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Onboarding em Lote
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
              Escala Regional: {country?.name}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black">
          FHIR INTEROP READY
        </Badge>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6 mt-4">
        {/* Step progress */}
        <div className="flex gap-4 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-1 space-y-2">
              <div className={cn("h-1.5 rounded-full transition-all", i <= step ? "bg-primary" : "bg-muted")} />
              <p className={cn("text-[9px] font-black uppercase tracking-tighter", i <= step ? "text-primary" : "text-muted-foreground")}>
                {i === 1 ? 'Preparação' : i === 2 ? 'Mapeamento' : 'Sucesso'}
              </p>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <Card className="border-2 border-dashed p-8 text-center bg-muted/20">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold">Importar Base de Unidades</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                  Carregue um CSV, JSON ou Excel com os dados da rede de hospitais, clínicas e farmácias de {country?.name}.
                </p>
                <Label className="cursor-pointer">
                  <Input type="file" className="hidden" onChange={handleFileUpload} accept=".csv,.json,.xlsx" />
                  <span className="bg-primary text-primary-foreground px-8 py-3 rounded-2xl font-bold inline-block hover:scale-105 transition-transform">
                    {file ? file.name : 'Selecionar Ficheiro'}
                  </span>
                </Label>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 flex gap-3 items-start">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Compliance Global</p>
                    <p className="text-[10px] text-muted-foreground">Dados processados em conformidade com o padrão internacional FHIR/HL7.</p>
                  </div>
                </Card>
                <Card className="p-4 flex gap-3 items-start">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <Database className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Auto-Geocoding</p>
                    <p className="text-[10px] text-muted-foreground">O sistema deteta automaticamente as coordenadas via Google Places API.</p>
                  </div>
                </Card>
                <Card className="p-4 flex gap-3 items-start">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Processamento em Nuvem</p>
                    <p className="text-[10px] text-muted-foreground">Uso de Google Cloud Healthcare API para processamento assíncrono.</p>
                  </div>
                </Card>
              </div>

              <Button
                className="w-full h-14 rounded-2xl font-black text-lg shadow-premium"
                disabled={!file}
                onClick={() => setStep(2)}
              >
                Analisar Mapeamento de Dados <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <Card className="shadow-premium border-none">
                <CardHeader className="bg-primary p-4 text-white">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Network className="h-4 w-4" /> Mapeamento de Recursos FHIR
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {fhirMapping.map((m, i) => (
                      <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase">Fonte: {m.source}</p>
                          <p className="text-sm font-bold text-primary">{m.fhir}</p>
                        </div>
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase",
                          m.status === 'valid' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                          {m.status === 'valid' ? 'Mapeamento Ok' : 'Validar Manualmente'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-4">
                <Zap className="h-6 w-6 text-blue-600 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-blue-900">Integração Healthcare API</p>
                  <p className="text-xs text-blue-800 leading-tight">
                    O sistema identificou <strong>42 novas unidades</strong> no ficheiro.
                    Serão criados recursos `Organization`, `Location` e `HealthcareService` vinculados a {country?.name}.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setStep(1)}>Voltar</Button>
                <Button className="flex-[2] h-12 rounded-xl font-black" onClick={startImport} disabled={uploading}>
                  {uploading ? 'A processar via Cloud...' : 'Confirmar Importação Estruturada'}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 py-12">
              <div className="relative inline-block">
                <div className="h-24 w-24 rounded-[2rem] bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                </div>
                <Zap className="absolute -top-2 -right-2 h-8 w-8 text-secondary animate-pulse" />
              </div>
              <h2 className="text-3xl font-black">Expansão Regional Ativa!</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                As unidades foram importadas, geocodificadas e integradas no ecossistema global da MedWallet.
              </p>

              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                <Card className="p-4 bg-muted/30">
                  <p className="text-2xl font-black text-primary">42</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Unidades</p>
                </Card>
                <Card className="p-4 bg-muted/30">
                  <p className="text-2xl font-black text-primary">100%</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">FHIR Ready</p>
                </Card>
              </div>

              <div className="pt-4">
                <Button className="rounded-2xl px-8 h-12 font-bold" onClick={() => navigate('/admin/country-dashboard')}>
                  Voltar ao Dashboard Regional
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
