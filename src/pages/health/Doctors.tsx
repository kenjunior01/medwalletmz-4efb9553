import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Stethoscope, Star, Clock, CheckCircle2, ArrowLeft, Bell, Sparkles, Video, MessageCircle } from 'lucide-react';
import WaitlistDialog from '@/components/providers/WaitlistDialog';
import { MeddyEmptyState } from '@/components/mascot/MeddyEmptyState';

interface Specialty { id: string; name: string; slug: string; icon: string }
interface Doctor {
  id: string;
  user_id: string;
  bio: string | null;
  consultation_fee: number;
  years_experience: number | null;
  is_verified: boolean;
  is_available: boolean;
  rating: number | null;
  specialty_id: string | null;
  avatar_url: string | null;
  profiles?: { full_name: string | null } | null;
  medical_specialties?: { name: string; icon: string } | null;
}

export default function Doctors() {
  const navigate = useNavigate();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  const activeSpec = useMemo(
    () => specialties.find(s => s.id === selectedSpecialty) ?? null,
    [specialties, selectedSpecialty]
  );

  useEffect(() => {
    supabase.from('medical_specialties').select('*').order('name').then(({ data }) => {
      setSpecialties(data || []);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    let q = supabase
      .from('doctor_profiles')
      .select('*, medical_specialties(name, icon)')
      .eq('is_available', true);
    if (selectedSpecialty) q = q.eq('specialty_id', selectedSpecialty);
    q.order('is_verified', { ascending: false }).then(async ({ data }) => {
      const list = (data as any) || [];
      const ids = list.map((d: any) => d.user_id);
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('user_id, full_name').in('user_id', ids);
        list.forEach((d: any) => {
          d.profiles = profs?.find((p: any) => p.user_id === d.user_id) || null;
        });
      }
      setDoctors(list);
      setLoading(false);
    });
  }, [selectedSpecialty]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">Médicos</h1>
            <p className="text-xs text-muted-foreground">Consultas online por chat seguro</p>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
          <Badge
            onClick={() => setSelectedSpecialty(null)}
            variant={selectedSpecialty === null ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap px-3 py-1.5"
          >
            Todas
          </Badge>
          {specialties.map((s) => (
            <Badge
              key={s.id}
              onClick={() => setSelectedSpecialty(s.id)}
              variant={selectedSpecialty === s.id ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap px-3 py-1.5"
            >
              {s.icon} {s.name}
            </Badge>
          ))}
        </div>
      </header>

      <div className="p-4 space-y-3">
        {loading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        {!loading && doctors.length === 0 && (
          <EmptyState
            onJoinWaitlist={() => setWaitlistOpen(true)}
            onTriage={() => navigate('/health/triage')}
            onEducation={() => navigate('/health/education')}
            onChat={() => navigate('/health/consultations')}
          />
        )}
        {doctors.map((d) => (
          <Card key={d.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-pharmacy to-primary flex items-center justify-center text-pharmacy-foreground text-xl font-bold shrink-0">
                  {d.profiles?.full_name?.[0] || 'M'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold truncate">Dr(a). {d.profiles?.full_name || 'Médico'}</h3>
                    {d.is_verified && <CheckCircle2 className="h-4 w-4 text-pharmacy shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {d.medical_specialties?.icon} {d.medical_specialties?.name || 'Clínica Geral'}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-gold text-gold" />{(d.rating || 0).toFixed(1)}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{d.years_experience || 0} anos</span>
                  </div>
                  {d.bio && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{d.bio}</p>}
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-bold text-pharmacy">{d.consultation_fee} MZN</span>
                    <Button size="sm" onClick={() => navigate(`/health/book/${d.id}`)}>
                      Marcar consulta
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <WaitlistDialog
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
        kind="doctor"
        specialtyId={activeSpec?.id}
        specialtyName={activeSpec?.name}
      />
    </div>
  );
}

/**
 * EmptyState — Recomendação 1.2 do relatório estratégico:
 * "Sem médicos disponíveis nesta especialidade" pode ser desmotivador.
 * Oferecemos alternativas concretas em vez de uma tela morta.
 */
function EmptyState({
  onJoinWaitlist, onTriage, onEducation, onChat,
}: {
  onJoinWaitlist: () => void;
  onTriage: () => void;
  onEducation: () => void;
  onChat: () => void;
}) {
  return (
    <Card className="overflow-hidden border-none shadow-md">
      {/* Meddy aparece a olhar e a pensar */}
      <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-pharmacy/10 pt-4">
        <MeddyEmptyState
          role="doctor"
          state="thinking"
          title="Ainda sem médicos nesta especialidade"
          message="Estamos a expandir a rede. Entretanto, há alternativas já disponíveis — escolhe uma:"
        />
      </div>

      <CardContent className="p-4 space-y-2.5">
        <button
          onClick={onJoinWaitlist}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition"
        >
          <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Bell className="h-4 w-4" />
          </div>
          <div className="text-left flex-1">
            <p className="font-bold text-sm">Avisa-me quando houver</p>
            <p className="text-[11px] opacity-90">Notificação imediata assim que estiver disponível</p>
          </div>
        </button>

        <button
          onClick={onTriage}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/15 hover:bg-secondary/25 transition"
        >
          <div className="h-9 w-9 rounded-lg bg-secondary/30 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-secondary-foreground" />
          </div>
          <div className="text-left flex-1">
            <p className="font-bold text-sm">Fazer Meddy Consulta agora</p>
            <p className="text-[11px] text-muted-foreground">Avaliação inicial dos sintomas em segundos</p>
          </div>
        </button>

        <button
          onClick={onChat}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition"
        >
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <MessageCircle className="h-4 w-4 text-foreground" />
          </div>
          <div className="text-left flex-1">
            <p className="font-bold text-sm">Chat médico geral</p>
            <p className="text-[11px] text-muted-foreground">Fala com clínico geral (qualquer especialidade)</p>
          </div>
        </button>

        <button
          onClick={onEducation}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition"
        >
          <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <Video className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-left flex-1">
            <p className="font-bold text-sm">Ler artigos de saúde</p>
            <p className="text-[11px] text-muted-foreground">Conteúdo educativo sobre a sua condição</p>
          </div>
        </button>
      </CardContent>

      <div className="px-4 pb-4 pt-1">
        <p className="text-[10px] text-muted-foreground text-center">
          És médico? <button className="text-primary underline" onClick={() => window.location.assign('/doctor/register')}>Junta-te à MedWallet</button>
        </p>
      </div>
    </Card>
  );
}