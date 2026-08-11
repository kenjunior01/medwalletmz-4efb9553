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
  Store, User, Mail, Phone, MapPin, Clock, Star,
  CheckCircle, AlertCircle, Pencil, Camera, Package,
  Banknote, ShoppingBag, TrendingUp, Award, Globe
} from "@/components/icons/lucide-compat";
import {
  PanelShell, NeuCard, BentoCard, BentoGrid, GlassCard,
  StatusBadge,
} from '@/components/ui/design-system';
import NumberFlow from '@number-flow/react';

interface PharmacyProfile {
  id: string;
  user_id: string;
  name: string;
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
  total_products?: number;
  total_orders?: number;
  monthly_revenue?: number;
  delivery_radius_km?: number;
  accepts_insurance: boolean;
  payment_methods: string[];
  operating_hours: string;
  created_at: string;
}

export default function PharmacyProfile() {
  const { user, hasRole } = useAuth();
  const { country, t } = useCountry();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PharmacyProfile | null>(null);
  const [stats, setStats] = useState({ pendingOrders: 0, monthlyRevenue: 0, totalProducts: 0 });
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<PharmacyProfile>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (!hasRole('store_owner') && !hasRole('pharmacy')) {
      navigate('/auth'); return;
    }
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data: p } = await (supabase as any)
      .from('stores')
      .select('*')
      .eq('user_id', user.id)
      .eq('store_type', 'pharmacy')
      .maybeSingle();
    if (!p) { setLoading(false); return; }
    setProfile({
      id: p.id,
      user_id: (p as any).user_id || p.id,
      name: (p as any).name || '',
      description: (p as any).description || '',
      phone: (p as any).phone || '',
      email: (p as any).email || '',
      address: (p as any).address || '',
      city: (p as any).city || '',
      country_code: (p as any).country_code || '',
      is_active: (p as any).is_active ?? true,
      is_verified: (p as any).is_verified ?? false,
      license_number: (p as any).license_number || '',
      license_type: (p as any).license_type || '',
      rating_avg: (p as any).rating_avg,
      total_products: (p as any).total_products,
      total_orders: (p as any).total_orders,
      monthly_revenue: (p as any).monthly_revenue,
      delivery_radius_km: (p as any).delivery_radius_km,
      accepts_insurance: (p as any).accepts_insurance ?? false,
      payment_methods: (p as any).payment_methods || [],
      operating_hours: (p as any).operating_hours || '',
      created_at: (p as any).created_at || '',
    });
    setEditForm({});

    const startMonth = new Date();
    startMonth.setDate(1);
    startMonth.setHours(0, 0, 0, 0);

    const { count: pendingCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', p.id)
      .eq('status', 'pending')
      .gte('created_at', startMonth.toISOString());

    setStats({
      pendingOrders: pendingCount || 0,
      monthlyRevenue: (p as any).monthly_revenue || 0,
      totalProducts: (p as any).total_products || 0,
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
    if (editForm.delivery_radius_km !== undefined) updates.delivery_radius_km = editForm.delivery_radius_km;
    if (editForm.operating_hours) updates.operating_hours = editForm.operating_hours;

    const { error } = await supabase
      .from('stores')
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
    await supabase.from('stores').update({ is_active: val }).eq('id', profile.id);
    setProfile({ ...profile, is_active: val });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse space-y-3 text-center">
          <Store className="h-10 w-10 mx-auto text-primary/50" />
          <p className="text-sm text-muted-foreground">{t('common.loading') || 'A carregar...'}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center text-center gap-4">
        <Store className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">{t('pharmacy.no_profile') || 'Ainda não tens perfil de farmácia'}</h2>
        <p className="text-sm text-muted-foreground">{t('pharmacy.register_first') || 'Regista a tua farmácia primeiro'}</p>
        <Button onClick={() => navigate('/pharmacy/register')}>
          <Package className="h-4 w-4 mr-2" />
          {t('pharmacy.register') || 'Registar Farmácia'}
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
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-pharmacy to-pharmacy/60 flex items-center justify-center overflow-hidden">
                {profile.logo_url ? (
                  <img src={profile.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-8 w-8 text-white" />
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-pharmacy text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black truncate">{profile.name}</h1>
                {profile.is_verified ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                    <CheckCircle className="h-3 w-3" /> {t('pharmacy.verified') || 'Verificada'}
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                    <AlertCircle className="h-3 w-3" /> {t('pharmacy.pending') || 'Pendente'}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('pharmacy.license') || 'Licença'}: {profile.license_number || '—'} ({profile.license_type || '—'})
              </p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {profile.city || '—'}
                </div>
                {profile.delivery_radius_km && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Globe className="h-3 w-3" /> {t('pharmacy.delivery_radius') || 'Raio'}: {profile.delivery_radius_km}km
                  </div>
                )}
              </div>
            </div>
          </div>

          <NeuCard className="!p-3 flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">{t('pharmacy.active') || 'Farmácia Activa'}</span>
            </div>
            <Switch checked={profile.is_active} onCheckedChange={toggleActive} />
          </NeuCard>
        </PanelShell>

        {/* Stats */}
        <BentoGrid className="grid-cols-3">
          <BentoCard size="sm" className="text-center">
            <ShoppingBag className="h-5 w-5 mx-auto text-pharmacy mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={stats.pendingOrders} /></p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('pharmacy.pending_orders') || 'Encomendas Pend.'}</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <Package className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={stats.totalProducts} /></p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('pharmacy.products') || 'Produtos'}</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <Star className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-xl font-black tabular-nums">{profile.rating_avg?.toFixed(1) || '—'}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('pharmacy.rating') || 'Avaliação'}</p>
          </BentoCard>
        </BentoGrid>

        {/* Profile Details */}
        <GlassCard className="!p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base">{t('pharmacy.profile_details') || 'Detalhes da Farmácia'}</h2>
            {!editing && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => { setEditing(true); setEditForm({}); }}>
                <Pencil className="h-3 w-3" /> {t('common.edit') || 'Editar'}
              </Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <Label>{t('pharmacy.name') || 'Nome da Farmácia'}</Label>
                <Input value={editForm.name ?? profile.name ?? ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <Label>{t('pharmacy.description') || 'Descrição'}</Label>
                <Textarea value={editForm.description ?? profile.description ?? ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('pharmacy.phone') || 'Telefone'}</Label>
                  <Input value={editForm.phone ?? profile.phone ?? ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div>
                  <Label>{t('pharmacy.delivery_radius') || 'Raio de Entrega (km)'}</Label>
                  <Input type="number" value={editForm.delivery_radius_km ?? profile.delivery_radius_km ?? 0} onChange={e => setEditForm({ ...editForm, delivery_radius_km: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>{t('pharmacy.address') || 'Endereço'}</Label>
                <Input value={editForm.address ?? profile.address ?? ''} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
              </div>
              <div>
                <Label>{t('pharmacy.operating_hours') || 'Horário de Funcionamento'}</Label>
                <Input value={editForm.operating_hours ?? profile.operating_hours ?? ''} onChange={e => setEditForm({ ...editForm, operating_hours: e.target.value })} placeholder="Seg-Sex: 08:00-18:00" />
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
              <InfoRow icon={<Store className="h-4 w-4" />} label={t('pharmacy.name') || 'Nome'} value={profile.name} />
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={profile.email || '—'} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label={t('pharmacy.phone') || 'Telefone'} value={profile.phone || '—'} />
              <InfoRow icon={<MapPin className="h-4 w-4" />} label={t('pharmacy.address') || 'Endereço'} value={profile.address || '—'} />
              <InfoRow icon={<MapPin className="h-4 w-4" />} label={t('pharmacy.city') || 'Cidade'} value={profile.city || '—'} />
              <InfoRow icon={<Clock className="h-4 w-4" />} label={t('pharmacy.hours') || 'Horário'} value={profile.operating_hours || '—'} />
              {profile.accepts_insurance && (
                <div className="flex items-center gap-2 pt-1">
                  <Award className="h-4 w-4 text-emerald-500" />
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    {t('pharmacy.accepts_insurance') || 'Aceita Seguros'}
                  </Badge>
                </div>
              )}
              {profile.payment_methods && profile.payment_methods.length > 0 && (
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mr-1">{t('pharmacy.payment_methods') || 'Pagamentos'}:</span>
                  {profile.payment_methods.map(m => (
                    <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                  ))}
                </div>
              )}
              {profile.description && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-1">{t('pharmacy.description') || 'Descrição'}</p>
                  <p className="text-sm leading-relaxed">{profile.description}</p>
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* Actions */}
        <div className="grid gap-2">
          <Button variant="outline" className="w-full h-12 border-pharmacy/40 hover:bg-pharmacy/10" onClick={() => navigate('/store/dashboard')}>
            <TrendingUp className="h-4 w-4 mr-2" /> {t('pharmacy.dashboard') || 'Painel da Farmácia'}
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
