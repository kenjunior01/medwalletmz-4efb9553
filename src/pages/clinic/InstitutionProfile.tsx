import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Building2, User, Mail, Phone, MapPin, Clock, Star,
  CheckCircle, AlertCircle, Pencil, Camera, Package,
  Banknote, Users, Award, Globe, Stethoscope, Shield
} from "@/components/icons/lucide-compat";
import {
  PanelShell, NeuCard, BentoCard, BentoGrid, GlassCard,
  StatusBadge,
} from '@/components/ui/design-system';
import NumberFlow from '@number-flow/react';

interface InstitutionProfile {
  id: string;
  user_id: string;
  name: string;
  institution_type: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country_code: string;
  logo_url?: string;
  cover_image_url?: string;
  is_active: boolean;
  is_verified: boolean;
  license_number: string;
  license_type: string;
  rating_avg?: number;
  total_doctors?: number;
  total_patients?: number;
  monthly_revenue?: number;
  departments?: string[];
  services?: string[];
  beds_count?: number;
  accepts_insurance: boolean;
  operating_hours: string;
  emergency: boolean;
  website?: string;
  created_at: string;
}

export default function InstitutionProfile() {
  const { user, hasRole } = useAuth();
  const { country, t } = useCountry();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<InstitutionProfile | null>(null);
  const [stats, setStats] = useState({ totalDoctors: 0, totalPatients: 0, monthlyRevenue: 0 });
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<InstitutionProfile>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (!hasRole('clinic') && !hasRole('hospital')) {
      navigate('/auth'); return;
    }
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data: p } = await (supabase as any)
      .from('clinics')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!p) { setLoading(false); return; }
    const row = p as Partial<InstitutionProfile> & Record<string, any>;
    setProfile({
      ...row,
      user_id: row.user_id ?? user.id,
      institution_type: row.institution_type ?? row.type ?? 'clinic',
      country_code: row.country_code ?? row.country_id ?? country?.id ?? 'MZ',
      license_number: row.license_number ?? '',
      license_type: row.license_type ?? '',
      accepts_insurance: row.accepts_insurance ?? false,
      operating_hours: row.operating_hours ?? '',
      emergency: row.emergency ?? false,
      created_at: row.created_at ?? new Date().toISOString(),
    } as InstitutionProfile);
    setEditForm({});

    setStats({
      totalDoctors: row.total_doctors || 0,
      totalPatients: row.total_patients || 0,
      monthlyRevenue: row.monthly_revenue || 0,
    });
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const updates: Record<string, any> = {};
    if (editForm.name) updates.name = editForm.name;
    if (editForm.description !== undefined) updates.description = editForm.description;
    if (editForm.phone) updates.phone = editForm.phone;
    if (editForm.address) updates.address = editForm.address;
    if (editForm.city) updates.city = editForm.city;
    if (editForm.website) updates.website = editForm.website;
    if (editForm.operating_hours) updates.operating_hours = editForm.operating_hours;
    if (editForm.beds_count !== undefined) updates.beds_count = editForm.beds_count;

    const { error } = await supabase
      .from('clinics')
      .update(updates)
      .eq('id', profile.id);

    if (!error) {
      setProfile({ ...profile, ...updates });
      setEditing(false);
      setEditForm({});
    }
    setSaving(false);
  };

  const toggleActive = async (val: boolean) => {
    if (!user || !profile) return;
    await supabase.from('clinics').update({ is_active: val }).eq('id', profile.id);
    setProfile({ ...profile, is_active: val });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse space-y-3 text-center">
          <Building2 className="h-11 w-11 mx-auto text-primary/50" />
          <p className="text-sm text-muted-foreground">{t('common.loading') || 'A carregar...'}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center text-center gap-4">
        <Building2 className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">{t('institution.no_profile') || 'Ainda não tens perfil de instituição'}</h2>
        <p className="text-sm text-muted-foreground">{t('institution.register_first') || 'Regista a tua instituição primeiro'}</p>
        <Button onClick={() => navigate('/clinic/register')}>
          <Building2 className="h-4 w-4 mr-2" />
          {t('institution.register') || 'Registar Instituição'}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="p-4 space-y-5 max-w-2xl mx-auto">
        {/* Hero */}
        <PanelShell className="p-6">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-teal-500 to-primary/60 flex items-center justify-center overflow-hidden">
                {profile.logo_url ? (
                  <img src={profile.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-8 w-8 text-white" />
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black truncate">{profile.name}</h1>
                {profile.is_verified ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                    <CheckCircle className="h-3 w-3" /> {t('institution.verified') || 'Verificada'}
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                    <AlertCircle className="h-3 w-3" /> {t('institution.pending') || 'Pendente'}
                  </Badge>
                )}
                {profile.emergency && (
                  <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
                    <Shield className="h-3 w-3" /> 24h
                  </Badge>
                )}
              </div>
              <p className="text-sm font-semibold text-teal-600 capitalize">{profile.institution_type || t('institution.type') || 'Instituição'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('institution.license') || 'Licença'}: {profile.license_number || '—'} ({profile.license_type || '—'})
              </p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {profile.city || '—'}, {profile.country_code || ''}
                </div>
              </div>
            </div>
          </div>

          <NeuCard className="!p-3 flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">{t('institution.active') || 'Instituição Activa'}</span>
            </div>
            <Switch checked={profile.is_active} onCheckedChange={toggleActive} />
          </NeuCard>
        </PanelShell>

        {/* Stats */}
        <BentoGrid className="grid-cols-3">
          <BentoCard size="sm" className="text-center">
            <Stethoscope className="h-5 w-5 mx-auto text-teal-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={stats.totalDoctors} /></p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('institution.doctors') || 'Médicos'}</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <Users className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={stats.totalPatients} /></p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('institution.patients') || 'Pacientes'}</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <Star className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-xl font-black tabular-nums">{profile.rating_avg?.toFixed(1) || '—'}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('institution.rating') || 'Avaliação'}</p>
          </BentoCard>
        </BentoGrid>

        {/* Profile Details */}
        <GlassCard className="!p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base">{t('institution.profile_details') || 'Detalhes da Instituição'}</h2>
            {!editing && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => { setEditing(true); setEditForm({}); }}>
                <Pencil className="h-3 w-3" /> {t('common.edit') || 'Editar'}
              </Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <Label>{t('institution.name') || 'Nome da Instituição'}</Label>
                <Input value={editForm.name ?? profile.name ?? ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <Label>{t('institution.description') || 'Descrição'}</Label>
                <Textarea value={editForm.description ?? profile.description ?? ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('institution.phone') || 'Telefone'}</Label>
                  <Input value={editForm.phone ?? profile.phone ?? ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div>
                  <Label>{t('institution.beds') || 'Nº de Camas'}</Label>
                  <Input type="number" value={editForm.beds_count ?? profile.beds_count ?? 0} onChange={e => setEditForm({ ...editForm, beds_count: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>{t('institution.address') || 'Endereço'}</Label>
                <Input value={editForm.address ?? profile.address ?? ''} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={editForm.website ?? profile.website ?? ''} onChange={e => setEditForm({ ...editForm, website: e.target.value })} />
              </div>
              <div>
                <Label>{t('institution.hours') || 'Horário'}</Label>
                <Input value={editForm.operating_hours ?? profile.operating_hours ?? ''} onChange={e => setEditForm({ ...editForm, operating_hours: e.target.value })} placeholder="24/7" />
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
              <InfoRow icon={<Building2 className="h-4 w-4" />} label={t('institution.name') || 'Nome'} value={profile.name} />
              <InfoRow icon={<Stethoscope className="h-4 w-4" />} label={t('institution.type') || 'Tipo'} value={profile.institution_type || '—'} />
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={profile.email || '—'} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label={t('institution.phone') || 'Telefone'} value={profile.phone || '—'} />
              <InfoRow icon={<MapPin className="h-4 w-4" />} label={t('institution.address') || 'Endereço'} value={profile.address || '—'} />
              <InfoRow icon={<MapPin className="h-4 w-4" />} label={t('institution.city') || 'Cidade'} value={`${profile.city || '—'}, ${profile.country_code || ''}`} />
              <InfoRow icon={<Clock className="h-4 w-4" />} label={t('institution.hours') || 'Horário'} value={profile.operating_hours || '—'} />
              <InfoRow icon={<Users className="h-4 w-4" />} label={t('institution.beds') || 'Camas'} value={profile.beds_count ? String(profile.beds_count) : '—'} />
              {profile.website && (
                <InfoRow icon={<Globe className="h-4 w-4" />} label="Website" value={profile.website} />
              )}
              {profile.accepts_insurance && (
                <div className="flex items-center gap-2 pt-1">
                  <Award className="h-4 w-4 text-emerald-500" />
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    {t('institution.accepts_insurance') || 'Aceita Seguros'}
                  </Badge>
                </div>
              )}
              {profile.departments && profile.departments.length > 0 && (
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <Stethoscope className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mr-1">{t('institution.departments') || 'Departamentos'}:</span>
                  {profile.departments.map(d => (
                    <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                  ))}
                </div>
              )}
              {profile.services && profile.services.length > 0 && (
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mr-1">{t('institution.services') || 'Serviços'}:</span>
                  {profile.services.map(s => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              )}
              {profile.description && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-1">{t('institution.description') || 'Descrição'}</p>
                  <p className="text-sm leading-relaxed">{profile.description}</p>
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* Actions */}
        <div className="grid gap-2">
          <Button variant="outline" className="w-full h-12 border-teal-500/40 hover:bg-teal-500/10" onClick={() => navigate('/clinic/dashboard')}>
            <Building2 className="h-4 w-4 mr-2" /> {t('institution.dashboard') || 'Painel da Instituição'}
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
