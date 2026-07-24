import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, MapPin, Bell, HelpCircle, LogOut, ChevronRight, Settings, Camera, Edit2, Package, FileText,
  Ticket, Store, Truck, Crown, Wallet, Stethoscope, Building2, Gift, PlusCircle, Award, ShieldCheck,
  Globe, FlaskConical, PawPrint, LayoutDashboard, Briefcase, Key, CreditCard, Lock, Moon, Sun,
  Monitor, BellRing, ToggleLeft, ChevronLeft, Shield, Palette
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { LowDataToggle } from "@/components/profile/LowDataToggle";
import { UserProposalsWidget } from "@/components/places/UserProposalsWidget";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { BentoGrid, BentoCard } from "@/components/ui/design-system";

type Profile = Tables<"profiles">;

/** Professional institution roles with their metadata */
const INSTITUTION_ROLES = [
  { role: "doctor" as const, icon: Stethoscope, color: "text-blue-500", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/20", gradient: "from-blue-500/5 to-blue-500/10", dashboard: "/doctor/dashboard", register: "/doctor/register", label: "Médico", desc: "Consultas e prescrições" },
  { role: "clinic" as const, icon: Building2, color: "text-gold", bgColor: "bg-gold/10", borderColor: "border-gold/20", gradient: "from-gold/5 to-gold/10", dashboard: "/clinic/dashboard", register: "/clinic/register", label: "Clínica", desc: "Gestão de equipa e pacientes" },
  { role: "store_owner" as const, icon: Store, color: "text-green-500", bgColor: "bg-green-500/10", borderColor: "border-green-500/20", gradient: "from-green-500/5 to-green-500/10", dashboard: "/store/dashboard", register: "/store/register", label: "Farmácia/Loja", desc: "Venda online e stock" },
  { role: "lab" as const, icon: FlaskConical, color: "text-cyan-500", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/20", gradient: "from-cyan-500/5 to-cyan-500/10", dashboard: "/lab/dashboard", register: "/lab/register", label: "Laboratório", desc: "Exames e resultados" },
  { role: "driver" as const, icon: Truck, color: "text-orange-500", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/20", gradient: "from-orange-500/5 to-orange-500/10", dashboard: "/driver/dashboard", register: "/driver/register", label: "Condutor", desc: "Entregas prioritárias" },
] as const;

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut, hasRole } = useAuth();
  const { country, t } = useCountry();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ orders: 0, prescriptions: 0, coupons: 0 });
  const [activeTab, setActiveTab] = useState("overview");

  const isManager = hasRole('country_manager') || hasRole('admin');

  const menuItems = [
    { icon: Wallet, label: t('profile.menu.wallet'), href: "/wallet" },
    { icon: MapPin, label: t('profile.menu.addresses'), href: "/addresses" },
    ...(isManager ? [{ icon: LayoutDashboard, label: 'Painel Regional', href: "/manager", highlight: true }] : []),
    { icon: PlusCircle, label: t('profile.menu.suggest'), href: "/suggest-place", highlight: !isManager, reward: true },
    { icon: Gift, label: t('profile.menu.referrals'), href: "/referrals" },
    { icon: Crown, label: t('profile.menu.subscriptions'), href: "/subscriptions" },
    { icon: HelpCircle, label: t('profile.menu.help'), href: "/help" },
    { icon: ShieldCheck, label: t('profile.menu.legal'), href: "/legal" },
  ];

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data: rows, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .rpc("get_profile_private" as any, { _user_id: user.id } as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (error && (error as any).code !== 'PGRST116') throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = Array.isArray(rows) ? rows[0] : rows;
      if (data) {
        setProfile(data);
        setEditName(data.full_name || "");
        setEditPhone(data.phone || "");
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      const ordersRes = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      const rxRes = await supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("patient_id", user.id);
      const couponsRes = await supabase.from("user_coupons").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("used_at", null);

      setStats({
        orders: ordersRes.count || 0,
        prescriptions: rxRes.count || 0,
        coupons: couponsRes.count || 0,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editName,
          phone: editPhone,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile((prev) => prev ? { ...prev, full_name: editName, phone: editPhone } : null);
      setEditOpen(false);
      toast.success(t('profile.update_success'));
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error(t('profile.update_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Guest view
  if (!user) {
    return (
      <div className="flex flex-col gap-6 p-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{t('profile.visitor')}</h1>
            <p className="text-sm text-muted-foreground">{t('profile.login_to_continue')}</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate("/auth")}>
            {t('auth.login')}
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <Package className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-primary">0</p>
            <p className="text-xs text-muted-foreground">{t('profile.orders')}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <FileText className="h-6 w-6 mx-auto mb-1 text-secondary" />
            <p className="text-2xl font-bold text-secondary">0</p>
            <p className="text-xs text-muted-foreground">{t('profile.prescriptions')}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <Ticket className="h-6 w-6 mx-auto mb-1 text-accent" />
            <p className="text-2xl font-bold text-accent">0</p>
            <p className="text-xs text-muted-foreground">{t('profile.coupons')}</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          {menuItems.map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => navigate("/auth")}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
            >
              <Icon className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium text-sm">{label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          MedWallet v1.0.0
        </p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Compute active institution roles
  const activeInstitutions = INSTITUTION_ROLES.filter(ir => hasRole(ir.role));

  return (
    <div className="flex flex-col gap-6 p-4 animate-fade-in">
      {/* ═══════════════════════════════════════════ */}
      {/* PROFILE HEADER — visible across all tabs    */}
      {/* ═══════════════════════════════════════════ */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Foto de perfil" className="w-full h-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-primary" />
            )}
          </div>
          <button className="absolute -bottom-1 -right-1 p-1.5 bg-primary rounded-full text-primary-foreground">
            <Camera className="h-3 w-3" />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{profile?.full_name || t('profile.user')}</h1>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          {profile?.phone && (
            <p className="text-xs text-muted-foreground">{profile.phone}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* TABS                                       */}
      {/* ═══════════════════════════════════════════ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-10">
          <TabsTrigger value="overview" className="text-[10px] sm:text-xs font-bold px-1">
            {t('profilehub.overview') || 'Geral'}
          </TabsTrigger>
          <TabsTrigger value="institutions" className="text-[10px] sm:text-xs font-bold px-1">
            {t('profilehub.institutions') || 'Instituições'}
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-[10px] sm:text-xs font-bold px-1">
            {t('profilehub.settings') || 'Definições'}
          </TabsTrigger>
          <TabsTrigger value="account" className="text-[10px] sm:text-xs font-bold px-1">
            {t('profilehub.account') || 'Conta'}
          </TabsTrigger>
        </TabsList>

        {/* ──── OVERVIEW TAB ──── */}
        <TabsContent value="overview">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <button 
              onClick={() => navigate("/orders")}
              className="bg-card rounded-xl border border-border p-3 text-center hover:bg-muted/50 transition-colors"
            >
              <Package className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold text-primary">{stats.orders}</p>
              <p className="text-xs text-muted-foreground">{t('profile.orders')}</p>
            </button>
            <button 
              onClick={() => navigate("/health/prescriptions")}
              className="bg-card rounded-xl border border-border p-3 text-center hover:bg-muted/50 transition-colors"
            >
              <FileText className="h-6 w-6 mx-auto mb-1 text-secondary" />
              <p className="text-2xl font-bold text-secondary">{stats.prescriptions}</p>
              <p className="text-xs text-muted-foreground">{t('profile.prescriptions')}</p>
            </button>
            <div className="bg-card rounded-xl border border-border p-3 text-center">
              <Ticket className="h-6 w-6 mx-auto mb-1 text-accent" />
              <p className="text-2xl font-bold text-accent">{stats.coupons}</p>
              <p className="text-xs text-muted-foreground">{t('profile.coupons')}</p>
            </div>
          </div>

          {/* Quick Actions Menu */}
          <div className="bg-card rounded-xl border border-border divide-y divide-border mt-5 overflow-hidden">
            {menuItems.map(({ icon: Icon, label, href, highlight, reward }) => (
              <button
                key={label}
                onClick={() => href.startsWith('/') ? navigate(href) : toast.info("Funcionalidade em breve")}
                className={`w-full flex items-center gap-3 p-4 transition-colors ${
                  highlight
                    ? "bg-gradient-to-r from-gold/10 via-transparent to-secondary/10 hover:from-gold/15"
                    : "hover:bg-muted/50"
                }`}
              >
                <Icon className={`h-5 w-5 ${highlight ? "text-gold" : "text-muted-foreground"}`} />
                <div className="flex-1 text-left">
                  <span className="font-medium text-sm block">{label}</span>
                  {reward && (
                    <span className="text-[10px] text-gold font-bold inline-flex items-center gap-0.5">
                      <Award className="h-3 w-3" /> +{country?.config?.registration_defaults?.reward_amount || 25} {country?.currency_symbol || 'MT'} por aprovação
                    </span>
                  )}
                </div>
                {highlight ? (
                  <span className="text-[9px] font-bold bg-gold/20 text-gold px-1.5 py-0.5 rounded">NOVO</span>
                ) : null}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>

          {/* Proposals */}
          <UserProposalsWidget userId={user.id} />
        </TabsContent>

        {/* ──── MY INSTITUTIONS TAB ──── */}
        <TabsContent value="institutions">
          <div className="mt-4 space-y-4">
            {/* Active Institutions — Bento Grid */}
            {activeInstitutions.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary/60">
                    {t('profilehub.active_roles') || 'Papéis Activos'}
                  </h3>
                  <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5">
                    {activeInstitutions.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeInstitutions.map((inst) => {
                    const Icon = inst.icon;
                    return (
                      <button
                        key={inst.role}
                        onClick={() => navigate(inst.dashboard)}
                        className="relative overflow-hidden rounded-2xl border p-4 text-left transition-all group active:scale-[0.98] bg-gradient-to-br hover:shadow-md"
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${inst.gradient} rounded-2xl`} />
                        <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-20 blur-xl ${inst.bgColor}`} />
                        
                        <div className="relative flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center border shrink-0 ${inst.bgColor} ${inst.borderColor}`}>
                            <Icon className={`h-6 w-6 ${inst.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm leading-tight">{inst.label}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{inst.desc}</p>
                            <Badge
                              variant="outline"
                              className="mt-2 text-[9px] px-1.5 py-0 h-4 rounded-full border bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            >
                              <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
                              {t('profilehub.verified') || 'Verificado'}
                            </Badge>
                          </div>
                          <div className={`flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity`}>
                            <span className="text-[10px] font-bold">{t('profilehub.open') || 'Abrir'}</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Register as Professional — Available roles */}
            <div className="flex items-center gap-2 mt-2">
              <PlusCircle className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
                {t('profilehub.available_roles') || 'Papéis Disponíveis'}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {INSTITUTION_ROLES.filter(ir => !hasRole(ir.role)).map((inst) => {
                const Icon = inst.icon;
                return (
                  <button
                    key={inst.role}
                    onClick={() => navigate(inst.register)}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-dashed border-border hover:border-primary/40 hover:bg-primary/[0.02] transition-all group active:scale-[0.99]"
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${inst.bgColor} ${inst.borderColor} shrink-0 group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-5 w-5 ${inst.color}`} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-bold text-sm">{inst.label}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">{inst.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ──── SETTINGS TAB ──── */}
        <TabsContent value="settings">
          <div className="mt-4 space-y-4">
            {/* Language & Region */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
                    {t('profilehub.language_region') || 'Idioma & Região'}
                  </h4>
                </div>
              </div>
              <LanguageSelector />
            </div>

            {/* Data Saver */}
            <div className="bg-card rounded-xl border border-border p-4">
              <LowDataToggle />
            </div>

            {/* Notifications placeholder */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => toast.info(t('profilehub.notifications_soon') || 'Em breve!')}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <BellRing className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm">{t('profilehub.notifications') || 'Notificações'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t('profilehub.notifications_desc') || 'Gerir alertas e preferências'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Theme placeholder */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => toast.info(t('profilehub.theme_soon') || 'Em breve!')}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Palette className="h-5 w-5 text-purple-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm">{t('profilehub.theme') || 'Tema'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t('profilehub.theme_desc') || 'Claro, escuro ou automático'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </TabsContent>

        {/* ──── ACCOUNT TAB ──── */}
        <TabsContent value="account">
          <div className="mt-4 space-y-4">
            {/* Change Password */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => toast.info(t('profilehub.password_soon') || 'Em breve!')}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Key className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm">{t('profilehub.change_password') || 'Alterar Palavra-passe'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t('profilehub.change_password_desc') || 'Actualizar a sua senha de acesso'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Payment Settings */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => navigate("/wallet")}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm">{t('profilehub.payment_settings') || 'Pagamentos'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t('profilehub.payment_settings_desc') || 'M-Pesa, cartão e métodos de pagamento'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Addresses */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => navigate("/addresses")}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-rose-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm">{t('profilehub.addresses') || 'Endereços'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t('profilehub.addresses_desc') || 'Gerir moradas de entrega e cobrança'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Privacy & Security */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => navigate("/legal")}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm">{t('profilehub.privacy') || 'Privacidade & Segurança'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t('profilehub.privacy_desc') || 'Dados, permissões e termos de uso'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════ */}
      {/* LOGOUT — always visible                      */}
      {/* ═══════════════════════════════════════════ */}
      <Button 
        variant="ghost" 
        className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleLogout}
      >
        <LogOut className="h-5 w-5" />
        {t('profile.logout')}
      </Button>

      {/* App Version */}
      <p className="text-center text-xs text-muted-foreground">
        MedWallet v1.0.0
      </p>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('profile.edit_profile')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('profile.full_name')}</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('profile.phone')}</label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+258 84 000 0000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? t('profile.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
