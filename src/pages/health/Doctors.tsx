import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Stethoscope, Star, Clock, CheckCircle2, ArrowLeft } from 'lucide-react';

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
          <div className="text-center py-12">
            <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum médico disponível nesta especialidade.</p>
          </div>
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
    </div>
  );
}