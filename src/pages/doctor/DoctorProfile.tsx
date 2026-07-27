import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Stethoscope, User, Mail, Phone, MapPin, Award,
  Clock, Star, CheckCircle, AlertCircle, Pencil,
  Camera, Languages, GraduationCap, Briefcase,
  ShieldCheck, Banknote, Calendar
} from "@/components/icons/lucide-compat";
import {
  PanelShell, NeuCard, BentoCard, BentoGrid, GlassCard,
  LayeredOrbs, StatusBadge,
} from '@/components/ui/design-system';
import NumberFlow from '@number-flow/react';

interface DoctorProfile {
  id: string;
  user_id: string;
  full_name: string;
  specialization: string;
  license_number: string;
  bio: string;
  phone: string;
  email: string;
  city: string;
  country_code: string;
  profile_image_url?: string;
  is_available: boolean;
  is_verified: boolean;
  consultation_fee: number;
  currency: string;
  languages: string[];
  education: string;
  experience_years: number;
  rating_avg?: number;
  total_consultations?: number;
  total_reviews?: number;
  created_at: string;
}

export default function DoctorProfile() {
  const { user, hasRole } = useAuth();
  const { country, t } = useCountry();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [stats, setStats] = useState({ monthlyPatients: 0, monthlyRevenue: 0, totalConsultations: 0 });
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<DoctorProfile>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !hasRole('doctor')) {
      navigate('/auth');
      return;
    }
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data: p, error } = await supabase
      .from('doctor_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error || !p) {
      setLoading(false);
      return;
    }
    setProfile(p as unknown as DoctorProfile);
    setEditForm({});

    // Load stats
    const startMonth = new Date();
    startMonth.setDate(1);
    startMonth.setHours(0, 0, 0, 0);

    const { data: monthly } = await supabase
      .from('consultations')
      .select('fee, patient_id, status')
      .eq('doctor_id', user.id)
      .gte('scheduled_at', startMonth.toISOString());

    const completed = (monthly || []).filter((c: any) => c.status === 'completed');
    setStats({
      monthlyPatients: new Set(completed.map((c: any) => c.patient_id)).size,
      monthlyRevenue: completed.reduce((s: number, c: any) => s + (c.fee || 0), 0),
      totalConsultations: p.total_consultations || 0,
    });
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const updates: Record<string, any> = {};
    if (editForm.full_name) updates.full_name = editForm.full_name;
    if (editForm.specialization) updates.specialization = editForm.specialization;
    if (editForm.bio !== undefined) updates.bio = editForm.bio;
    if (editForm.phone) updates.phone = editForm.phone;
    if (editForm.education) updates.education = editForm.education;
    if (editForm.consultation_fee !== undefined) updates.consultation_fee = editForm.consultation_fee;
    if (editForm.languages) updates.languages = editForm.languages;

    const { error } = await supabase
      .from('doctor_profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (!error) {
      setProfile({ ...profile, ...updates });
      setEditing(false);
      setEditForm({});
    }
    setSaving(false);
  };

  const toggleAvailability = async (val: boolean) => {
    if (!user || !profile) return;
    await supabase
      .from('doctor_profiles')
      .update({ is_available: val })
      .eq('user_id', user.id);
    setProfile({ ...profile, is_available: val });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse space-y-3 text-center">
          <Stethoscope className="h-10 w-10 mx-auto text-primary/50" />
          <p className="text-sm text-muted-foreground">{t('common.loading') || 'A carregar...'}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center text-center gap-4">
        <Stethoscope className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">{t('doctor.no_profile') || 'Ainda não tens perfil médico'}</h2>
        <p className="text-sm text-muted-foreground">{t('doctor.register_first') || 'Regista-te primeiro como médico'}</p>
        <Button onClick={() => navigate('/doctor/register')}>
          <GraduationCap className="h-4 w-4 mr-2" />
          {t('doctor.register') || 'Registar como Médico'}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="p-4 space-y-5 max-w-2xl mx-auto">
        {/* Hero Card */}
        <PanelShell className="p-6">
          <LayeredOrbs variant="ocean" />
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-secondary to-primary/60 flex items-center justify-center overflow-hidden">
                {profile.profile_image_url ? (
                  <img src={profile.profile_image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-white" />
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black truncate">{profile.full_name || 'Dr(a).'}</h1>
                {profile.is_verified ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                    <CheckCircle className="h-3 w-3" /> {t('doctor.verified') || 'Verificado'}
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                    <AlertCircle className="h-3 w-3" /> {t('doctor.pending') || 'Pendente'}
                  </Badge>
                )}
              </div>
              <p className="text-sm font-semibold text-secondary">{profile.specialization || t('doctor.specialization') || 'Especialidade'}</p>
              <p className="text-xs text-muted-foreground mt-1">{profile.license_number || 'N/A'}</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {profile.city || '—'}, {profile.country_code || '—'}
                </div>
                {profile.languages && profile.languages.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Languages className="h-3 w-3" /> {profile.languages.join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Availability toggle */}
          <NeuCard className="!p-3 flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">{t('doctor.available') || 'Disponível para consultas'}</span>
            </div>
            <Switch checked={profile.is_available} onCheckedChange={toggleAvailability} />
          </NeuCard>
        </PanelShell>

        {/* Stats Grid */}
        <BentoGrid className="grid-cols-3">
          <BentoCard size="sm" className="text-center">
            <Calendar className="h-5 w-5 mx-auto text-secondary mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={stats.monthlyPatients} /></p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('doctor.monthly_patients') || 'Pacientes/Mês'}</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <Banknote className="h-5 w-5 mx-auto text-gold mb-1" />
            <p className="text-xl font-black tabular-nums text-gold"><NumberFlow value={stats.monthlyRevenue} /></p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('doctor.monthly_revenue') || 'Receita/Mês'}</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <Star className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-xl font-black tabular-nums">{profile.rating_avg?.toFixed(1) || '—'}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('doctor.rating') || 'Avaliação'}</p>
          </BentoCard>
        </BentoGrid>

        {/* Profile Details */}
        <GlassCard className="!p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base">{t('doctor.profile_details') || 'Detalhes do Perfil'}</h2>
            {!editing && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => { setEditing(true); setEditForm({}); }}>
                <Pencil className="h-3 w-3" /> {t('common.edit') || 'Editar'}
              </Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <Label>{t('doctor.full_name') || 'Nome Completo'}</Label>
                <Input value={editForm.full_name ?? profile.full_name ?? ''} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} />
              </div>
              <div>
                <Label>{t('doctor.specialization') || 'Especialização'}</Label>
                <Input value={editForm.specialization ?? profile.specialization ?? ''} onChange={e => setEditForm({ ...editForm, specialization: e.target.value })} />
              </div>
              <div>
                <Label>{t('doctor.bio') || 'Biografia'}</Label>
                <Textarea value={editForm.bio ?? profile.bio ?? ''} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('doctor.phone') || 'Telefone'}</Label>
                  <Input value={editForm.phone ?? profile.phone ?? ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div>
                  <Label>{t('doctor.consultation_fee') || 'Taxa de Consulta'}</Label>
                  <Input type="number" value={editForm.consultation_fee ?? profile.consultation_fee ?? 0} onChange={e => setEditForm({ ...editForm, consultation_fee: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>{t('doctor.education') || 'Formação Acadêmica'}</Label>
                <Input value={editForm.education ?? profile.education ?? ''} onChange={e => setEditForm({ ...editForm, education: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (t('common.loading') || 'A guardar...') : (t('common.save') || 'Guardar')}
                </Button>
                <Button variant="outline" onClick={() => { setEditing(false); setEditForm({}); }}>
                  {t('common.cancel') || 'Cancelar'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <InfoRow icon={<User className="h-4 w-4" />} label={t('doctor.full_name') || 'Nome'} value={profile.full_name || '—'} />
              <InfoRow icon={<Stethoscope className="h-4 w-4" />} label={t('doctor.specialization') || 'Especialização'} value={profile.specialization || '—'} />
              <InfoRow icon={<GraduationCap className="h-4 w-4" />} label={t('doctor.education') || 'Formação'} value={profile.education || '—'} />
              <InfoRow icon={<Briefcase className="h-4 w-4" />} label={t('doctor.experience') || 'Experiência'} value={profile.experience_years ? `${profile.experience_years} anos` : '—'} />
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={profile.email || '—'} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label={t('doctor.phone') || 'Telefone'} value={profile.phone || '—'} />
              <InfoRow icon={<MapPin className="h-4 w-4" />} label={t('doctor.location') || 'Localização'} value={`${profile.city || '—'}, ${profile.country_code || ''}`} />
              <InfoRow icon={<Banknote className="h-4 w-4" />} label={t('doctor.consultation_fee') || 'Taxa'} value={`${profile.consultation_fee || 0} ${profile.currency || country?.currency_code || ''}`} />
              {profile.bio && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-1">{t('doctor.bio') || 'Biografia'}</p>
                  <p className="text-sm leading-relaxed">{profile.bio}</p>
                </div>
              )}
              {profile.languages && profile.languages.length > 0 && (
                <div className="flex items-center gap-2 pt-2">
                  <Languages className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{t('doctor.languages') || 'Idiomas'}:</span>
                  <div className="flex gap-1 flex-wrap">
                    {profile.languages.map(l => (
                      <Badge key={l} variant="secondary" className="text-xs">{l}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* Verification Status */}
        {!profile.is_verified && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-700">{t('doctor.verify_title') || 'Verificação Pendente'}</p>
                  <p className="text-xs text-amber-600/80 mt-1">{t('doctor.verify_desc') || 'A tua licença médica está a ser verificada. Este processo pode demorar até 48 horas.'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="grid gap-2">
          <Button variant="outline" className="w-full h-12 border-secondary/40 hover:bg-secondary/10" onClick={() => navigate('/doctor/availability')}>
            <Clock className="h-4 w-4 mr-2" /> {t('doctor.manage_availability') || 'Gerir Disponibilidade'}
          </Button>
          <Button variant="outline" className="w-full h-12" onClick={() => navigate('/doctor/dashboard')}>
            <Stethoscope className="h-4 w-4 mr-2" /> {t('doctor.dashboard') || 'Painel do Médico'}
          </Button>
        </div>
      </main>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-xs text-muted-foreground min-w-[80px]">{label}</span>
      <span className="text-sm font-medium flex-1 truncate">{value}</span>
    </div>
  );
}
