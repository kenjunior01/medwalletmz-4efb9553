import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProvince } from '@/themes';
import { useCountry } from '@/contexts/CountryContext';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { GlassCard, BentoCard, BentoGrid } from '@/components/ui/design-system';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Settings,
  MapPin,
  Globe,
  Palette,
  Bell,
  Shield,
  Clock,
  Save,
  RotateCcw,
  Building2,
  Phone,
  Mail,
  Navigation,
  Camera,
  FileText,
  AlertTriangle,
  Users,
  Truck,
  Wallet,
  Zap,
} from '@/components/icons/lucide-compat';

// ── Animation variants ───────────────────────────────────────────
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

// ── Types ────────────────────────────────────────────────────────
interface NotificationSettings {
  newUsers: boolean;
  newOrders: boolean;
  verificationRequests: boolean;
  dailySummary: boolean;
}

interface ApprovalWorkflow {
  autoApproveDoctors: boolean;
  autoApproveRiders: boolean;
  autoApproveStores: boolean;
}

interface EmergencyContact {
  healthHotline: string;
  police: string;
  fire: string;
}

interface OperationalSettings {
  operatingHoursStart: string;
  operatingHoursEnd: string;
  deliveryRadius: string;
  minOrder: string;
  freeDeliveryThreshold: string;
  deliveryFee: string;
}

// ── Default values ───────────────────────────────────────────────
const defaultNotifications: NotificationSettings = {
  newUsers: true,
  newOrders: true,
  verificationRequests: false,
  dailySummary: true,
};

const defaultApprovals: ApprovalWorkflow = {
  autoApproveDoctors: false,
  autoApproveRiders: false,
  autoApproveStores: false,
};

const defaultEmergency: EmergencyContact = {
  healthHotline: '84',
  police: '112',
  fire: '117',
};

const defaultOperational: OperationalSettings = {
  operatingHoursStart: '07:00',
  operatingHoursEnd: '20:00',
  deliveryRadius: '15',
  minOrder: '250',
  freeDeliveryThreshold: '2000',
  deliveryFee: '75',
};

// ── Supabase table name ──────────────────────────────────────────
const SETTINGS_TABLE = 'province_settings';

export default function RegionalSettings() {
  const { province } = useProvince();
  const { t } = useCountry();

  // ── Local state ───────────────────────────────────────────────
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications);
  const [approvals, setApprovals] = useState<ApprovalWorkflow>(defaultApprovals);
  const [emergency, setEmergency] = useState<EmergencyContact>(defaultEmergency);
  const [operational, setOperational] = useState<OperationalSettings>(defaultOperational);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Province fallback values
  const provinceName = province?.name ?? t('province_settings.province_name') ?? 'Província';
  const provinceNameEn = province?.nameEn ?? 'Province';
  const provinceCapital = province?.capital ?? t('province_settings.capital') ?? 'Capital';
  const culturalSymbol = province?.culturalSymbol ?? '🏛️';
  const provinceDescription = province?.description ?? t('province_settings.no_description') ?? 'Sem descrição disponível.';
  const provinceDescriptionEn = province?.descriptionEn ?? 'No description available.';

  // ── Load settings from Supabase ───────────────────────────────
  useEffect(() => {
    if (!province?.id) {
      setLoading(false);
      return;
    }

    async function loadSettings() {
      try {
        const { data, error } = await (supabase as any)
          .from(SETTINGS_TABLE)
          .select('*')
          .eq('province_id', province.id)
          .single();

        if (data) {
          if (data.notifications) setNotifications({ ...defaultNotifications, ...data.notifications });
          if (data.approvals) setApprovals({ ...defaultApprovals, ...data.approvals });
          if (data.emergency) setEmergency({ ...defaultEmergency, ...data.emergency });
          if (data.operational) setOperational({ ...defaultOperational, ...data.operational });
          if (data.description) setDescription(data.description);
        }
      } catch {
        // Use defaults on error
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [province?.id]);

  // ── Track changes ─────────────────────────────────────────────
  const markChanged = useCallback(() => setHasChanges(true), []);

  // ── Notification toggle handler ───────────────────────────────
  const toggleNotification = (key: keyof NotificationSettings) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    markChanged();
  };

  // ── Approval toggle handler ───────────────────────────────────
  const toggleApproval = (key: keyof ApprovalWorkflow) => {
    setApprovals((prev) => ({ ...prev, [key]: !prev[key] }));
    markChanged();
  };

  // ── Save handler ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!province?.id) {
      toast.error(t('province_settings.no_province_selected') ?? 'Nenhuma província selecionada');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        province_id: province.id,
        notifications,
        approvals,
        emergency,
        operational,
        description,
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase as any)
        .from(SETTINGS_TABLE)
        .upsert(payload, { onConflict: 'province_id' });

      if (error) throw error;

      setHasChanges(false);
      toast.success(t('province_settings.saved') ?? 'Configurações guardadas com sucesso!');
    } catch {
      toast.error(t('province_settings.save_error') ?? 'Erro ao guardar configurações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // ── Reset handler ─────────────────────────────────────────────
  const handleReset = () => {
    setNotifications(defaultNotifications);
    setApprovals(defaultApprovals);
    setEmergency(defaultEmergency);
    setOperational(defaultOperational);
    setDescription(province?.description ?? '');
    setHasChanges(false);
    toast.info(t('province_settings.reset') ?? 'Configurações restauradas para os valores padrão.');
  };

  // ── Loading skeleton ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  // ── Province color entries for swatches ───────────────────────
  const colorSwatches = province
    ? [
        { label: 'Primary', value: province.colors.primary },
        { label: 'Primary Light', value: province.colors.primaryLight },
        { label: 'Primary Dark', value: province.colors.primaryDark },
        { label: 'Secondary', value: province.colors.secondary },
        { label: 'Secondary Light', value: province.colors.secondaryLight },
        { label: 'Accent', value: province.colors.accent },
        { label: 'Background', value: province.colors.background },
        { label: 'Surface', value: province.colors.surface },
      ]
    : [];

  const gradientPreviews = province
    ? [
        { label: 'Hero', value: province.gradients.hero },
        { label: 'Card', value: province.gradients.card },
        { label: 'Accent', value: province.gradients.accent },
        { label: 'Dark', value: province.gradients.dark },
      ]
    : [];

  return (
    <motion.section
      className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* ── Page Header ──────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: province?.gradients.accent ?? 'linear-gradient(135deg, #00838F, #1A237E)' }}
          >
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              {t('province_settings.title') ?? 'Configurações Provinciais'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('province_settings.subtitle') ?? 'Gerir definições da província e operações'}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <MapPin className="w-3 h-3" />
          {provinceName}
        </Badge>
      </motion.div>

      {/* ── Province Identity Card ──────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <GlassCard className="relative overflow-hidden">
          {/* Gradient accent strip */}
          <div
            className="absolute top-0 left-0 right-0 h-1.5"
            style={{ background: province?.gradients.hero ?? 'linear-gradient(135deg, #00838F, #1A237E)' }}
          />

          <div className="pt-4 flex flex-col md:flex-row gap-5">
            {/* Left: identity info */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl" role="img" aria-label={t('province_settings.cultural_symbol') ?? 'Símbolo cultural'}>
                  {culturalSymbol}
                </span>
                <div>
                  <h2 className="text-lg font-semibold">{provinceName}</h2>
                  <p className="text-sm text-muted-foreground">{provinceNameEn}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('province_settings.capital') ?? 'Capital'}:</span>
                  <span className="font-medium">{provinceCapital}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('province_settings.pattern') ?? 'Padrão'}:</span>
                  <span className="font-medium capitalize">{province?.pattern ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Navigation className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('province_settings.id') ?? 'ID'}:</span>
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{province?.id ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Camera className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('province_settings.particles') ?? 'Partículas'}:</span>
                  <span className="font-medium">{province?.particles.pattern ?? '—'}</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {provinceDescription}
              </p>
            </div>

            {/* Right: gradient preview card */}
            <div className="md:w-52 space-y-2 flex-shrink-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('province_settings.gradient_preview') ?? 'Pré-visualização do Gradiente'}
              </p>
              <div className="space-y-2">
                {gradientPreviews.map((g) => (
                  <div
                    key={g.label}
                    className="h-10 rounded-lg shadow-sm border border-border/50"
                    style={{ background: g.value }}
                  />
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ── Province Color Swatches ─────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <GlassCard>
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              {t('province_settings.color_palette') ?? 'Paleta de Cores da Província'}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {colorSwatches.map((swatch) => (
              <div key={swatch.label} className="flex flex-col items-center gap-1">
                <div
                  className="w-10 h-10 rounded-lg shadow-sm border border-border/50"
                  style={{ backgroundColor: swatch.value }}
                  title={`${swatch.label}: ${swatch.value}`}
                />
                <span className="text-[10px] text-muted-foreground leading-tight text-center max-w-[56px]">
                  {swatch.label}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* ── Notification Settings ───────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              {t('province_settings.notifications') ?? 'Configurações de Notificações'}
            </h3>
          </div>

          <div className="space-y-4">
            {/* New Users */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {t('province_settings.new_users') ?? 'Novos Utilizadores'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t('province_settings.new_users_desc') ?? 'Receber notificação quando novos utilizadores se registarem'}
                  </p>
                </div>
              </div>
              <Switch
                checked={notifications.newUsers}
                onCheckedChange={() => toggleNotification('newUsers')}
                aria-label={t('province_settings.new_users') ?? 'Novos Utilizadores'}
              />
            </div>

            {/* New Orders */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-4 h-4 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {t('province_settings.new_orders') ?? 'Novas Encomendas'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t('province_settings.new_orders_desc') ?? 'Receber notificação para cada nova encomenda'}
                  </p>
                </div>
              </div>
              <Switch
                checked={notifications.newOrders}
                onCheckedChange={() => toggleNotification('newOrders')}
                aria-label={t('province_settings.new_orders') ?? 'Novas Encomendas'}
              />
            </div>

            {/* Verification Requests */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-sky-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {t('province_settings.verification_requests') ?? 'Pedidos de Verificação'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t('province_settings.verification_requests_desc') ?? 'Notificar quando profissionais solicitarem verificação'}
                  </p>
                </div>
              </div>
              <Switch
                checked={notifications.verificationRequests}
                onCheckedChange={() => toggleNotification('verificationRequests')}
                aria-label={t('province_settings.verification_requests') ?? 'Pedidos de Verificação'}
              />
            </div>

            {/* Daily Summary */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-violet-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {t('province_settings.daily_summary') ?? 'Resumo Diário'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t('province_settings.daily_summary_desc') ?? 'Receber um relatório diário das actividades da província'}
                  </p>
                </div>
              </div>
              <Switch
                checked={notifications.dailySummary}
                onCheckedChange={() => toggleNotification('dailySummary')}
                aria-label={t('province_settings.daily_summary') ?? 'Resumo Diário'}
              />
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ── Operational Settings ────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              {t('province_settings.operational') ?? 'Configurações Operacionais'}
            </h3>
          </div>

          <BentoGrid className="auto-rows-auto mb-2">
            {/* Operating Hours Start */}
            <BentoCard size="sm" className="flex flex-col justify-center">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                {t('province_settings.hours_start') ?? 'Abertura'}
              </Label>
              <Input
                type="time"
                value={operational.operatingHoursStart}
                onChange={(e) => {
                  setOperational((p) => ({ ...p, operatingHoursStart: e.target.value }));
                  markChanged();
                }}
                className="h-9 text-sm"
              />
            </BentoCard>

            {/* Operating Hours End */}
            <BentoCard size="sm" className="flex flex-col justify-center">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                {t('province_settings.hours_end') ?? 'Fecho'}
              </Label>
              <Input
                type="time"
                value={operational.operatingHoursEnd}
                onChange={(e) => {
                  setOperational((p) => ({ ...p, operatingHoursEnd: e.target.value }));
                  markChanged();
                }}
                className="h-9 text-sm"
              />
            </BentoCard>

            {/* Delivery Radius */}
            <BentoCard size="sm" className="flex flex-col justify-center">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Navigation className="w-3 h-3" />
                {t('province_settings.delivery_radius') ?? 'Raio de Entrega (km)'}
              </Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={operational.deliveryRadius}
                onChange={(e) => {
                  setOperational((p) => ({ ...p, deliveryRadius: e.target.value }));
                  markChanged();
                }}
                className="h-9 text-sm"
                placeholder="15"
              />
            </BentoCard>

            {/* Min Order */}
            <BentoCard size="sm" className="flex flex-col justify-center">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Wallet className="w-3 h-3" />
                {t('province_settings.min_order') ?? 'Encomenda Mínima (MT)'}
              </Label>
              <Input
                type="number"
                min="0"
                value={operational.minOrder}
                onChange={(e) => {
                  setOperational((p) => ({ ...p, minOrder: e.target.value }));
                  markChanged();
                }}
                className="h-9 text-sm"
                placeholder="250"
              />
            </BentoCard>

            {/* Free Delivery Threshold */}
            <BentoCard size="sm" className="flex flex-col justify-center">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Truck className="w-3 h-3" />
                {t('province_settings.free_delivery_threshold') ?? 'Entrega Grátis a partir de (MT)'}
              </Label>
              <Input
                type="number"
                min="0"
                value={operational.freeDeliveryThreshold}
                onChange={(e) => {
                  setOperational((p) => ({ ...p, freeDeliveryThreshold: e.target.value }));
                  markChanged();
                }}
                className="h-9 text-sm"
                placeholder="2000"
              />
            </BentoCard>

            {/* Delivery Fee */}
            <BentoCard size="sm" className="flex flex-col justify-center">
              <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Zap className="w-3 h-3" />
                {t('province_settings.delivery_fee') ?? 'Taxa de Entrega (MT)'}
              </Label>
              <Input
                type="number"
                min="0"
                value={operational.deliveryFee}
                onChange={(e) => {
                  setOperational((p) => ({ ...p, deliveryFee: e.target.value }));
                  markChanged();
                }}
                className="h-9 text-sm"
                placeholder="75"
              />
            </BentoCard>
          </BentoGrid>
        </GlassCard>
      </motion.div>

      {/* ── Approval Workflow ───────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              {t('province_settings.approval_workflow') ?? 'Fluxo de Aprovação Automática'}
            </h3>
          </div>

          <div className="space-y-4">
            {/* Auto-approve Doctors */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-rose-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {t('province_settings.auto_doctors') ?? 'Aprovar Médicos Automaticamente'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t('province_settings.auto_doctors_desc') ?? 'Médicos registados serão aprovados sem revisão manual'}
                  </p>
                </div>
              </div>
              <Switch
                checked={approvals.autoApproveDoctors}
                onCheckedChange={() => toggleApproval('autoApproveDoctors')}
                aria-label={t('province_settings.auto_doctors') ?? 'Aprovar Médicos'}
              />
            </div>

            {/* Auto-approve Riders */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-4 h-4 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {t('province_settings.auto_riders') ?? 'Aprovar Entregadores Automaticamente'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t('province_settings.auto_riders_desc') ?? 'Entregadores registados serão aprovados sem revisão manual'}
                  </p>
                </div>
              </div>
              <Switch
                checked={approvals.autoApproveRiders}
                onCheckedChange={() => toggleApproval('autoApproveRiders')}
                aria-label={t('province_settings.auto_riders') ?? 'Aprovar Entregadores'}
              />
            </div>

            {/* Auto-approve Stores */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {t('province_settings.auto_stores') ?? 'Aprovar Farmácias/Lojas Automaticamente'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t('province_settings.auto_stores_desc') ?? 'Estabelecimentos registados serão aprovados sem revisão manual'}
                  </p>
                </div>
              </div>
              <Switch
                checked={approvals.autoApproveStores}
                onCheckedChange={() => toggleApproval('autoApproveStores')}
                aria-label={t('province_settings.auto_stores') ?? 'Aprovar Farmácias/Lojas'}
              />
            </div>
          </div>

          {/* Warning for auto-approve */}
          {(approvals.autoApproveDoctors || approvals.autoApproveRiders || approvals.autoApproveStores) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3"
            >
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {t('province_settings.auto_approve_warning') ??
                  'A aprovação automática pode permitir entrada de utilizadores não verificados. Use com cautela.'}
              </p>
            </motion.div>
          )}
        </GlassCard>
      </motion.div>

      {/* ── Emergency Contacts ──────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              {t('province_settings.emergency_contacts') ?? 'Contactos de Emergência'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Health Hotline */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Mail className="w-3 h-3" />
                {t('province_settings.health_hotline') ?? 'Linha de Saúde'}
              </Label>
              <Input
                type="tel"
                value={emergency.healthHotline}
                onChange={(e) => {
                  setEmergency((p) => ({ ...p, healthHotline: e.target.value }));
                  markChanged();
                }}
                className="h-9 text-sm"
                placeholder="84"
              />
            </div>

            {/* Police */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                {t('province_settings.police') ?? 'Polícia'}
              </Label>
              <Input
                type="tel"
                value={emergency.police}
                onChange={(e) => {
                  setEmergency((p) => ({ ...p, police: e.target.value }));
                  markChanged();
                }}
                className="h-9 text-sm"
                placeholder="112"
              />
            </div>

            {/* Fire */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                {t('province_settings.fire') ?? 'Bombeiros'}
              </Label>
              <Input
                type="tel"
                value={emergency.fire}
                onChange={(e) => {
                  setEmergency((p) => ({ ...p, fire: e.target.value }));
                  markChanged();
                }}
                className="h-9 text-sm"
                placeholder="117"
              />
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ── Province Description ────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <GlassCard>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              {t('province_settings.description_title') ?? 'Descrição da Província'}
            </h3>
          </div>

          <p className="text-xs text-muted-foreground mb-2">
            {t('province_settings.description_help') ??
              'Escreva uma descrição personalizada da província que será exibida aos utilizadores. Deixe vazio para usar a descrição padrão.'}
          </p>

          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              markChanged();
            }}
            placeholder={provinceDescription}
            rows={4}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 resize-y"
            aria-label={t('province_settings.description_title') ?? 'Descrição da Província'}
          />

          {province && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="w-3 h-3" />
              <span>
                {t('province_settings.default_en') ?? 'Inglês'}: {provinceDescriptionEn}
              </span>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* ── Action Buttons ──────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 pb-4">
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="flex-1 sm:flex-initial gap-2 min-w-[160px]"
        >
          {saving ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              {t('province_settings.saving') ?? 'A guardar...'}
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {t('province_settings.save') ?? 'Guardar Alterações'}
            </>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={handleReset}
          disabled={saving}
          className="flex-1 sm:flex-initial gap-2 min-w-[160px]"
        >
          <RotateCcw className="w-4 h-4" />
          {t('province_settings.reset_defaults') ?? 'Restaurar Padrões'}
        </Button>

        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400"
          >
            <AlertTriangle className="w-3 h-3" />
            {t('province_settings.unsaved') ?? 'Alterações não guardadas'}
          </motion.div>
        )}
      </motion.div>
    </motion.section>
  );
}
