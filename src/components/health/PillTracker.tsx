import { useEffect, useState } from 'react';
import { Pill, Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCountry } from '@/contexts/CountryContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type Medication = { id: string; name: string; dosage: string; time: string; taken: boolean };

export function PillTracker() {
  const { t } = useCountry();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meds, setMeds] = useState<Medication[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('prescriptions')
        .select('id, prescription_items(id, medication_name, dosage, frequency)')
        .eq('patient_id', user.id)
        .in('status', ['active', 'pending', 'sent'])
        .order('created_at', { ascending: false })
        .limit(3);

      const rows = (data || []).flatMap((rx: any) =>
        (rx.prescription_items || []).map((item: any, index: number) => ({
          id: item.id,
          name: item.medication_name,
          dosage: item.dosage || 'Dose indicada',
          time: item.frequency || ['08:00', '14:00', '20:00'][index % 3],
          taken: false,
        }))
      ).slice(0, 3);
      setMeds(rows);
    })();
  }, [user]);

  const toggleTaken = (id: string) => {
    setMeds(prev => prev.map(m => m.id === id ? { ...m, taken: !m.taken } : m));
  };

  return (
    <section className="px-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Pill className="h-5 w-5 text-emerald-500" /> {t('health.my_medications')}
        </h2>
        <Button variant="ghost" size="sm" className="text-primary font-bold" onClick={() => navigate('/health/profile')}>
          <Plus className="h-4 w-4 mr-1" /> {t('health.add')}
        </Button>
      </div>

      <div className="space-y-3">
        {meds.length === 0 ? (
          <Card className="p-4 border-dashed bg-muted/20 text-sm text-muted-foreground">
            Nenhum medicamento ativo encontrado. Adicione pelo botão ou consulte suas receitas digitais.
          </Card>
        ) : meds.map((med) => (
          <Card
            key={med.id}
            className={cn(
              "p-4 flex items-center gap-4 border-2 transition-all",
              med.taken ? "bg-muted/30 border-transparent opacity-70" : "border-emerald-500/10 bg-white"
            )}
          >
            <div className={cn(
              "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0",
              med.taken ? "bg-muted text-muted-foreground" : "bg-emerald-100 text-emerald-600"
            )}>
              <Pill className="h-6 w-6" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm truncate">{med.name}</h3>
                <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4">{med.dosage}</Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-muted-foreground">
                <Clock className="h-3 w-3" /> {med.time}
                {med.taken && <span className="text-emerald-600 ml-1 flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> {t('health.taken')}</span>}
              </div>
            </div>

            <button
              onClick={() => toggleTaken(med.id)}
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                med.taken ? "bg-emerald-500 text-white" : "bg-muted hover:bg-emerald-100 text-muted-foreground"
              )}
            >
              <CheckCircle2 className="h-6 w-6" />
            </button>
          </Card>
        ))}

        <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-2xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] font-medium text-amber-800 leading-tight">
            {t('health.antibiotic_warning')}
          </p>
        </div>
      </div>
    </section>
  );
}
