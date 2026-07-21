import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function VerifyPrescription() {
  const { code } = useParams();
  const [state, setState] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!code) return;
    (async () => {
      const { data, error } = await supabase.rpc('verify_prescription', { _code: code });
      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        setState('invalid');
        return;
      }
      setData(Array.isArray(data) ? data[0] : data);
      setState('valid');
    })();
  }, [code]);

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Helmet><title>Verificar Receita | MedWallet</title></Helmet>
      <Card className="max-w-md w-full p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-xs text-muted-foreground">← MedWallet</Link>
        </div>
        {state === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">A verificar receita...</p>
          </div>
        )}
        {state === 'invalid' && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <ShieldAlert className="h-12 w-12 text-destructive" />
            <h1 className="font-bold text-lg">Receita não encontrada</h1>
            <p className="text-sm text-muted-foreground">O código {code} não corresponde a nenhuma receita emitida pelo MedWallet.</p>
          </div>
        )}
        {state === 'valid' && data && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
              <h1 className="font-bold text-lg">Receita Autêntica</h1>
              <Badge variant={data.is_valid ? 'default' : 'outline'}>
                {data.is_valid ? 'Válida' : 'Expirada'}
              </Badge>
            </div>
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Médico:</span> Dr(a). {data.doctor_name}</p>
              {data.specialty && <p><span className="text-muted-foreground">Especialidade:</span> {data.specialty}</p>}
              <p><span className="text-muted-foreground">Paciente:</span> {data.patient_name}</p>
              <p><span className="text-muted-foreground">Emitida:</span> {new Date(data.issued_at).toLocaleString('pt-PT')}</p>
              {data.expires_at && (
                <p><span className="text-muted-foreground">Válida até:</span> {new Date(data.expires_at).toLocaleDateString('pt-PT')}</p>
              )}
              <p><span className="text-muted-foreground">Medicamentos:</span> {data.items_count}</p>
            </div>
            <p className="text-[10px] text-muted-foreground pt-2 border-t">Assinatura: {data.signature_hash?.slice(0, 16)}...</p>
          </div>
        )}
      </Card>
    </div>
  );
}