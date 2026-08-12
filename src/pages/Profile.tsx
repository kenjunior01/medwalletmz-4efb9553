/**
 * Profile — User profile hub
 *
 * Improvements (Task ID 22):
 * - Skeleton loading (role="status", aria-busy) for profile, avatar, stats, documents
 * - Progressive disclosure via tabs (Personal, Health, Documents, Roles, Security)
 * - WCAG 2.1 AA: 44px touch targets, aria-labels, focus-visible:ring-2 ring-offset-2,
 *   role="status"/"alert", aria-hidden on decorative icons, sr-only labels
 * - Framer-motion entrance animations on cards (stagger)
 * - Hardcoded Portuguese → t() via useCountry()
 * - Friendly error state with retry
 * - Empty states for sections without data (no documents, no roles, empty stats)
 * - Trust/verification badges prominently displayed
 * - Quick actions section (edit profile, manage roles, view documents, view orders)
 * - Avatar upload with preview and crop hint
 * - Account completion progress bar
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, MapPin, HelpCircle, LogOut, ChevronRight, Camera, Edit2, Package, FileText,
  Ticket, Store, Truck, Crown, Wallet, Stethoscope, Building2, Gift, PlusCircle, Award, ShieldCheck,
  Globe, FlaskConical, LayoutDashboard, Briefcase, Key, CreditCard, Lock,
  BellRing, Palette, AlertCircle, RefreshCw, Loader2, IdCard, Heart,
  CheckCircle2, FileCheck2,
} from '@/components/icons/lucide-compat';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { LowDataToggle } from "@/components/profile/LowDataToggle";
import { UserProposalsWidget } from "@/components/places/UserProposalsWidget";
import { LanguageSelector } from "@/components/layout/LanguageSelector";

type Profile = Tables<"profiles">;

/** Professional institution roles with their metadata (labels via i18n keys). */
const INSTITUTION_ROLES = [
  {
    role: "doctor" as const,
    icon: Stethoscope,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    gradient: "from-blue-500/5 to-blue-500/10",
    dashboard: "/doctor/dashboard",
    register: "/doctor/register",
    labelKey: "profile.role_doctor",
    descKey: "profile.role_doctor_desc",
  },
  {
    role: "clinic" as const,
    icon: Building2,
    color: "text-gold",
    bgColor: "bg-gold/10",
    borderColor: "border-gold/20",
    gradient: "from-gold/5 to-gold/10",
    dashboard: "/clinic/dashboard",
    register: "/clinic/register",
    labelKey: "profile.role_clinic",
    descKey: "profile.role_clinic_desc",
  },
  {
    role: "store_owner" as const,
    icon: Store,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    gradient: "from-green-500/5 to-green-500/10",
    dashboard: "/store/dashboard",
    register: "/store/register",
    labelKey: "profile.role_store_owner",
    descKey: "profile.role_store_owner_desc",
  },
  {
    role: "lab" as const,
    icon: FlaskConical,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
    gradient: "from-cyan-500/5 to-cyan-500/10",
    dashboard: "/lab/dashboard",
    register: "/lab/register",
    labelKey: "profile.role_lab",
    descKey: "profile.role_lab_desc",
  },
  {
    role: "driver" as const,
    icon: Truck,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    gradient: "from-orange-500/5 to-orange-500/10",
    dashboard: "/driver/dashboard",
    register: "/driver/register",
    labelKey: "profile.role_driver",
    descKey: "profile.role_driver_desc",
  },
] as const;

// Motion variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut, hasRole } = useAuth();
  const { country, t } = useCountry();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [stats, setStats] = useState({ orders: 0, prescriptions: 0, coupons: 0, documents: 0 });
  const [misauLinked, setMisauLinked] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isManager = hasRole("country_manager") || hasRole("admin");

  const menuItems = [
    { icon: Wallet, label: t("profile.menu.wallet"), href: "/wallet" },
    { icon: MapPin, label: t("profile.menu.addresses"), href: "/addresses" },
    ...(isManager
      ? [{ icon: LayoutDashboard, label: t("profile.regional_panel"), href: "/manager", highlight: true }]
      : []),
    {
      icon: PlusCircle,
      label: t("profile.menu.suggest"),
      href: "/suggest-place",
      highlight: !isManager,
      reward: true,
    },
    { icon: Gift, label: t("profile.menu.referrals"), href: "/referrals" },
    { icon: Crown, label: t("profile.menu.subscriptions"), href: "/subscriptions" },
    { icon: HelpCircle, label: t("profile.menu.help"), href: "/help" },
    { icon: ShieldCheck, label: t("profile.menu.legal"), href: "/legal" },
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
    setError(null);

    try {
      const { data: rows, error: rpcError } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .rpc("get_profile_private" as any, { _user_id: user.id } as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (rpcError && (rpcError as any).code !== "PGRST116") throw rpcError;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = Array.isArray(rows) ? rows[0] : rows;
      if (data) {
        setProfile(data);
        setEditName(data.full_name || "");
        setEditPhone(data.phone || "");
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      setError(t("profile.error_title"));
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      const ordersRes = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      const rxRes = await supabase
        .from("prescriptions")
        .select("id", { count: "exact", head: true })
        .eq("patient_id", user.id);
      const couponsRes = await supabase
        .from("user_coupons")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("used_at", null);

      // Medical records (documents) count — used in the Documents tab
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docsRes: any = await supabase
        .from("medical_records" as any)
        .select("id", { count: "exact", head: true })
        .eq("patient_id", user.id);

      // MISAU / patient profile check
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ppRes: any = await supabase
        .from("patient_profiles" as any)
        .select("medical_id")
        .eq("user_id", user.id)
        .maybeSingle();

      setStats({
        orders: ordersRes.count || 0,
        prescriptions: rxRes.count || 0,
        coupons: couponsRes.count || 0,
        documents: docsRes.count || 0,
      });
      setMisauLinked(Boolean(ppRes?.data?.medical_id));
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

      setProfile((prev) => (prev ? { ...prev, full_name: editName, phone: editPhone } : null));
      setEditOpen(false);
      toast.success(t("profile.update_success"));
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error(t("profile.update_error"));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("profile.avatar_upload_error"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("profile.avatar_upload_error"));
      return;
    }

    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${pub.publicUrl}?t=${Date.now()}`;

      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (updErr) throw updErr;

      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : null));
      toast.success(t("profile.avatar_upload_success"));
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error(t("profile.avatar_upload_error"));
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Compute active institution roles
  const activeInstitutions = useMemo(
    () => INSTITUTION_ROLES.filter((ir) => hasRole(ir.role)),
    [hasRole],
  );

  // Account completion percentage (5 steps × 20%)
  const completion = useMemo(() => {
    if (!user) return 0;
    let score = 0;
    if (user.email) score += 20;
    if (profile?.full_name) score += 20;
    if (profile?.phone) score += 20;
    if (profile?.avatar_url) score += 20;
    if (activeInstitutions.length > 0) score += 20;
    return score;
  }, [user, profile, activeInstitutions]);

  const completionSteps = [
    { done: Boolean(user?.email), label: t("profile.completion_step_email") },
    { done: Boolean(profile?.full_name), label: t("profile.completion_step_name") },
    { done: Boolean(profile?.phone), label: t("profile.completion_step_phone") },
    { done: Boolean(profile?.avatar_url), label: t("profile.completion_step_avatar") },
    { done: activeInstitutions.length > 0, label: t("profile.completion_step_role") },
  ];

  // ─── Guest view ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <motion.div
        className="flex flex-col gap-6 p-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-primary" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{t("profile.visitor")}</h1>
            <p className="text-sm text-muted-foreground">{t("profile.login_to_continue")}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={() => navigate("/auth")}
          >
            {t("auth.login")}
          </Button>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="grid grid-cols-3 gap-3"
          role="status"
          aria-label={t("profile.guest_stats_aria")}
        >
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <Package className="h-6 w-6 mx-auto mb-1 text-primary" aria-hidden="true" />
            <p className="text-2xl font-bold text-primary">0</p>
            <p className="text-xs text-muted-foreground">{t("profile.orders")}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <FileText className="h-6 w-6 mx-auto mb-1 text-secondary" aria-hidden="true" />
            <p className="text-2xl font-bold text-secondary">0</p>
            <p className="text-xs text-muted-foreground">{t("profile.prescriptions")}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <Ticket className="h-6 w-6 mx-auto mb-1 text-accent" aria-hidden="true" />
            <p className="text-2xl font-bold text-accent">0</p>
            <p className="text-xs text-muted-foreground">{t("profile.coupons")}</p>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-card rounded-xl border border-border divide-y divide-border"
        >
          {menuItems.map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => navigate("/auth")}
              className="w-full flex items-center gap-3 p-4 min-h-[56px] hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
            >
              <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <span className="flex-1 text-left font-medium text-sm">{label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </button>
          ))}
        </motion.div>

        <motion.p variants={itemVariants} className="text-center text-xs text-muted-foreground">
          {t("profile.version_label")}
        </motion.p>
      </motion.div>
    );
  }

  // ─── Loading skeleton (role="status") ──────────────────────────────────
  if (loading) {
    return (
      <div
        className="flex flex-col gap-6 p-4"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={t("profile.loading")}
      >
        <span className="sr-only">{t("profile.loading")}</span>
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-11 w-11 rounded-md" />
        </div>

        {/* Trust badges skeleton */}
        <div className="flex gap-2" aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-6 w-28 rounded-full" />
          ))}
        </div>

        {/* Completion bar skeleton */}
        <Skeleton className="h-20 rounded-xl" />

        {/* Tabs skeleton */}
        <Skeleton className="h-10 w-full rounded-md" />

        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>

        {/* Quick actions skeleton */}
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // ─── Error state (role="alert") ────────────────────────────────────────
  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center text-center py-16 px-4"
      >
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-bold text-foreground">{t("profile.error_title")}</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">{t("profile.error_desc")}</p>
        <Button
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchProfile();
            fetchStats();
          }}
          className="mt-5 min-h-[44px] gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={t("profile.retry")}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t("profile.retry")}
        </Button>
      </div>
    );
  }

  const displayName = profile?.full_name || t("profile.user");
  const hasStats = stats.orders > 0 || stats.prescriptions > 0 || stats.coupons > 0;
  const documentsCount = stats.documents;
  const documentsLabel =
    documentsCount === 0
      ? t("profile.no_documents_short")
      : documentsCount === 1
        ? t("profile.single_document")
        : t("profile.documents_count", { count: String(documentsCount) });

  return (
    <motion.div
      className="flex flex-col gap-6 p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ═══════════════════════════════════════════ */}
      {/* PROFILE HEADER                              */}
      {/* ═══════════════════════════════════════════ */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <div className="relative">
          <button
            type="button"
            onClick={handleAvatarClick}
            disabled={avatarUploading}
            className="relative w-16 h-16 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait"
            aria-label={t("profile.avatar_button_aria")}
          >
            {avatarUploading ? (
              <Loader2 className="h-6 w-6 text-primary animate-spin" aria-hidden="true" />
            ) : profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={t("profile.avatar_alt", { name: displayName })}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-primary" aria-hidden="true" />
            )}
          </button>
          <span
            className="absolute -bottom-1 -right-1 p-1.5 bg-primary rounded-full text-primary-foreground pointer-events-none"
            aria-hidden="true"
          >
            <Camera className="h-3 w-3" />
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="sr-only"
            aria-label={t("profile.upload_avatar")}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{displayName}</h1>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          {profile?.phone && (
            <p className="text-xs text-muted-foreground">{profile.phone}</p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">{t("profile.avatar_hint")}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEditOpen(true)}
          className="h-11 w-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={t("profile.edit_button_aria")}
        >
          <Edit2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </motion.div>

      {/* Hidden file input is rendered above next to the avatar button */}

      {/* ═══════════════════════════════════════════ */}
      {/* TRUST BADGES STRIP                         */}
      {/* ═══════════════════════════════════════════ */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className="gap-1.5 bg-green-50/50 border-green-200 text-green-700 text-xs py-1"
        >
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t("profile.trust_verified")}
        </Badge>
        <Badge
          variant="outline"
          className="gap-1.5 bg-blue-50/50 border-blue-200 text-blue-700 text-xs py-1"
        >
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          {t("profile.trust_encrypted")}
        </Badge>
        {misauLinked && (
          <Badge
            variant="outline"
            className="gap-1.5 bg-emerald-50/50 border-emerald-200 text-emerald-700 text-xs py-1"
          >
            <IdCard className="h-3.5 w-3.5" aria-hidden="true" />
            {t("profile.trust_misau_registered")}
          </Badge>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════ */}
      {/* ACCOUNT COMPLETION                         */}
      {/* ═══════════════════════════════════════════ */}
      <motion.div
        variants={itemVariants}
        className="bg-card rounded-2xl border border-border p-4"
        aria-label={t("profile.completion_title")}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-bold">{t("profile.completion_title")}</p>
            <p className="text-[11px] text-muted-foreground">{t("profile.completion_desc")}</p>
          </div>
          <span className="text-sm font-black text-primary">
            {completion === 100
              ? t("profile.completion_done")
              : t("profile.completion_percent", { percent: String(completion) })}
          </span>
        </div>
        <Progress value={completion} className="h-2" aria-hidden="true" />
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          {completionSteps.map((step) => (
            <li
              key={step.label}
              className={`inline-flex items-center gap-1 ${step.done ? "text-green-700" : "text-muted-foreground"}`}
            >
              {step.done ? (
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              )}
              {step.label}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* ═══════════════════════════════════════════ */}
      {/* TABS                                       */}
      {/* ═══════════════════════════════════════════ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList
          aria-label={t("profile.tablist_label")}
          className="w-full grid grid-cols-5 h-10"
        >
          <TabsTrigger value="personal" className="text-[10px] sm:text-xs font-bold px-1">
            {t("profile.tab_personal")}
          </TabsTrigger>
          <TabsTrigger value="health" className="text-[10px] sm:text-xs font-bold px-1">
            {t("profile.tab_health")}
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-[10px] sm:text-xs font-bold px-1">
            {t("profile.tab_documents")}
          </TabsTrigger>
          <TabsTrigger value="roles" className="text-[10px] sm:text-xs font-bold px-1">
            {t("profile.tab_roles")}
          </TabsTrigger>
          <TabsTrigger value="security" className="text-[10px] sm:text-xs font-bold px-1">
            {t("profile.tab_security")}
          </TabsTrigger>
        </TabsList>

        {/* ──── PERSONAL TAB ──── */}
        <TabsContent value="personal">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-4 space-y-4"
          >
            {/* Stats */}
            {hasStats ? (
              <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => navigate("/orders")}
                  className="bg-card rounded-xl border border-border p-3 text-center hover:bg-muted/50 transition-colors min-h-[96px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={t("profile.stats_button_aria_orders")}
                >
                  <Package className="h-6 w-6 mx-auto mb-1 text-primary" aria-hidden="true" />
                  <p className="text-2xl font-bold text-primary">{stats.orders}</p>
                  <p className="text-xs text-muted-foreground">{t("profile.orders")}</p>
                </button>
                <button
                  onClick={() => navigate("/health/prescriptions")}
                  className="bg-card rounded-xl border border-border p-3 text-center hover:bg-muted/50 transition-colors min-h-[96px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={t("profile.stats_button_aria_prescriptions")}
                >
                  <FileText className="h-6 w-6 mx-auto mb-1 text-secondary" aria-hidden="true" />
                  <p className="text-2xl font-bold text-secondary">{stats.prescriptions}</p>
                  <p className="text-xs text-muted-foreground">{t("profile.prescriptions")}</p>
                </button>
                <div className="bg-card rounded-xl border border-border p-3 text-center min-h-[96px]">
                  <Ticket className="h-6 w-6 mx-auto mb-1 text-accent" aria-hidden="true" />
                  <p className="text-2xl font-bold text-accent">{stats.coupons}</p>
                  <p className="text-xs text-muted-foreground">{t("profile.coupons")}</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                variants={itemVariants}
                className="bg-card rounded-xl border border-dashed border-border p-6 text-center"
              >
                <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-bold">{t("profile.empty_stats_title")}</p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
                  {t("profile.empty_stats_desc")}
                </p>
              </motion.div>
            )}

            {/* Quick actions menu */}
            <motion.div
              variants={itemVariants}
              className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden"
            >
              <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                  {t("profile.section_quick_actions")}
                </span>
              </div>
              {menuItems.map(({ icon: Icon, label, href, highlight, reward }) => (
                <button
                  key={label}
                  onClick={() =>
                    href.startsWith("/") ? navigate(href) : toast.info(t("profile.feature_soon"))
                  }
                  className={`w-full flex items-center gap-3 p-4 min-h-[64px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                    highlight
                      ? "bg-gradient-to-r from-gold/10 via-transparent to-secondary/10 hover:from-gold/15"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${highlight ? "text-gold" : "text-muted-foreground"}`}
                    aria-hidden="true"
                  />
                  <div className="flex-1 text-left">
                    <span className="font-medium text-sm block">{label}</span>
                    {reward && (
                      <span className="text-[10px] text-gold font-bold inline-flex items-center gap-0.5">
                        <Award className="h-3 w-3" aria-hidden="true" />
                        {t("profile.suggest_reward", {
                          amount: String(
                            country?.config?.registration_defaults?.reward_amount || 25,
                          ),
                          currency: country?.currency_symbol || "MT",
                        })}
                      </span>
                    )}
                  </div>
                  {highlight ? (
                    <span className="text-[9px] font-bold bg-gold/20 text-gold px-1.5 py-0.5 rounded">
                      {t("profile.new_badge")}
                    </span>
                  ) : null}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
            </motion.div>

            {/* Proposals */}
            <motion.div variants={itemVariants}>
              <UserProposalsWidget userId={user.id} />
            </motion.div>
          </motion.div>
        </TabsContent>

        {/* ──── HEALTH TAB ──── */}
        <TabsContent value="health">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-4 space-y-4"
          >
            {/* MISAU card */}
            <motion.button
              variants={itemVariants}
              onClick={() => navigate("/health")}
              className="w-full text-left bg-card rounded-2xl border border-border p-4 hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[88px]"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                  <IdCard className="h-6 w-6 text-green-600" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{t("profile.health_summary_title")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("profile.health_open_wallet_desc")}
                  </p>
                  {misauLinked ? (
                    <Badge
                      variant="outline"
                      className="mt-2 text-[9px] px-1.5 py-0 h-4 rounded-full bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-0.5"
                    >
                      <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
                      {t("profile.health_misau_linked")}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="mt-2 text-[9px] px-1.5 py-0 h-4 rounded-full bg-muted text-muted-foreground border-border gap-0.5"
                    >
                      {t("profile.health_misau_not_linked")}
                    </Badge>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </motion.button>

            {/* Quick links */}
            <motion.div
              variants={itemVariants}
              className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden"
            >
              <button
                onClick={() => navigate("/health")}
                className="w-full flex items-center gap-3 p-4 min-h-[64px] hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                <div className="h-11 w-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-rose-500" aria-hidden="true" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm">{t("profile.action_open_health")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("profile.health_open_wallet")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </button>
              <button
                onClick={() => navigate("/health/records")}
                className="w-full flex items-center gap-3 p-4 min-h-[64px] hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                <div className="h-11 w-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-cyan-500" aria-hidden="true" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm">{t("profile.health_view_records")}</p>
                  <p className="text-[11px] text-muted-foreground">{documentsLabel}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </motion.div>

            {!misauLinked && (
              <motion.div
                variants={itemVariants}
                className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 text-amber-900"
                role="status"
              >
                <p className="text-xs font-bold">{t("profile.no_health_data")}</p>
                <p className="text-[11px] mt-1">{t("profile.no_health_data_desc")}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 min-h-[44px] border-amber-300 text-amber-800 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                  onClick={() => navigate("/health")}
                >
                  {t("profile.no_documents_cta")}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </TabsContent>

        {/* ──── DOCUMENTS TAB ──── */}
        <TabsContent value="documents">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-4 space-y-4"
          >
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-between px-1"
            >
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-primary" aria-hidden="true" />
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/70">
                  {t("profile.section_documents")}
                </h3>
              </div>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {documentsLabel}
              </Badge>
            </motion.div>

            {documentsCount === 0 ? (
              <motion.div
                variants={itemVariants}
                className="bg-card rounded-2xl border border-dashed border-border p-8 text-center"
                role="status"
              >
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                </div>
                <p className="text-sm font-bold">{t("profile.no_documents_title")}</p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
                  {t("profile.no_documents_desc")}
                </p>
                <Button
                  onClick={() => navigate("/health")}
                  className="mt-4 min-h-[44px] gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {t("profile.no_documents_cta")}
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                variants={itemVariants}
                className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden"
              >
                <button
                  onClick={() => navigate("/health/records")}
                  className="w-full flex items-center gap-3 p-4 min-h-[64px] hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                >
                  <div className="h-11 w-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-cyan-500" aria-hidden="true" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-sm">{t("profile.health_view_records")}</p>
                    <p className="text-[11px] text-muted-foreground">{documentsLabel}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </button>
                <button
                  onClick={() => navigate("/health/prescriptions")}
                  className="w-full flex items-center gap-3 p-4 min-h-[64px] hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                >
                  <div className="h-11 w-11 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                    <FileCheck2 className="h-5 w-5 text-secondary" aria-hidden="true" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-sm">{t("profile.action_view_prescriptions")}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("profile.documents_count", { count: String(stats.prescriptions) })}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </button>
              </motion.div>
            )}
          </motion.div>
        </TabsContent>

        {/* ──── ROLES TAB ──── */}
        <TabsContent value="roles">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-4 space-y-4"
          >
            {/* Active Institutions */}
            {activeInstitutions.length > 0 && (
              <>
                <motion.div variants={itemVariants} className="flex items-center gap-2 mb-2 px-1">
                  <Briefcase className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary/60">
                    {t("profile.section_roles")}
                  </h3>
                  <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5">
                    {activeInstitutions.length === 1
                      ? t("profile.single_role")
                      : t("profile.roles_count", { count: String(activeInstitutions.length) })}
                  </Badge>
                </motion.div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeInstitutions.map((inst) => {
                    const Icon = inst.icon;
                    return (
                      <motion.button
                        key={inst.role}
                        variants={itemVariants}
                        onClick={() => navigate(inst.dashboard)}
                        className="relative overflow-hidden rounded-2xl border p-4 text-left transition-all group active:scale-[0.98] bg-gradient-to-br hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[100px]"
                      >
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${inst.gradient} rounded-2xl`}
                          aria-hidden="true"
                        />
                        <div
                          className={`absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-20 blur-xl ${inst.bgColor}`}
                          aria-hidden="true"
                        />

                        <div className="relative flex items-center gap-4">
                          <div
                            className={`h-12 w-12 rounded-xl flex items-center justify-center border shrink-0 ${inst.bgColor} ${inst.borderColor}`}
                          >
                            <Icon className={`h-6 w-6 ${inst.color}`} aria-hidden="true" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm leading-tight">{t(inst.labelKey)}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {t(inst.descKey)}
                            </p>
                            <Badge
                              variant="outline"
                              className="mt-2 text-[9px] px-1.5 py-0 h-4 rounded-full border bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            >
                              <ShieldCheck className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
                              {t("profile.trust_verified")}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Empty state for roles */}
            {activeInstitutions.length === 0 && (
              <motion.div
                variants={itemVariants}
                className="bg-card rounded-2xl border border-dashed border-border p-8 text-center"
                role="status"
              >
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                </div>
                <p className="text-sm font-bold">{t("profile.no_roles_title")}</p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto">
                  {t("profile.no_roles_desc")}
                </p>
              </motion.div>
            )}

            {/* Register as Professional — Available roles */}
            <motion.div variants={itemVariants} className="flex items-center gap-2 mt-2 px-1">
              <PlusCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
                {t("profilehub.available_roles")}
              </h3>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {INSTITUTION_ROLES.filter((ir) => !hasRole(ir.role)).map((inst) => {
                const Icon = inst.icon;
                return (
                  <motion.button
                    key={inst.role}
                    variants={itemVariants}
                    onClick={() => navigate(inst.register)}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-dashed border-border hover:border-primary/40 hover:bg-primary/[0.02] transition-all group active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[80px]"
                  >
                    <div
                      className={`h-11 w-11 rounded-xl flex items-center justify-center border ${inst.bgColor} ${inst.borderColor} shrink-0 group-hover:scale-110 transition-transform`}
                    >
                      <Icon className={`h-5 w-5 ${inst.color}`} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-bold text-sm">{t(inst.labelKey)}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {t(inst.descKey)}
                      </p>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0"
                      aria-hidden="true"
                    />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </TabsContent>

        {/* ──── SECURITY TAB (settings + account merged) ──── */}
        <TabsContent value="security">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-4 space-y-4"
          >
            {/* Language & Region */}
            <motion.div
              variants={itemVariants}
              className="bg-card rounded-xl border border-border overflow-hidden"
            >
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
                    {t("settings.language_region")}
                  </h4>
                </div>
              </div>
              <LanguageSelector />
            </motion.div>

            {/* Data Saver */}
            <motion.div
              variants={itemVariants}
              className="bg-card rounded-xl border border-border p-4"
            >
              <LowDataToggle />
            </motion.div>

            {/* Change Password */}
            <motion.div
              variants={itemVariants}
              className="bg-card rounded-xl border border-border overflow-hidden"
            >
              <button
                onClick={() => toast.info(t("profilehub.password_soon"))}
                className="w-full flex items-center gap-3 p-4 min-h-[64px] hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                <div className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Key className="h-5 w-5 text-amber-500" aria-hidden="true" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm">{t("profilehub.change_password")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("profilehub.change_password_desc")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </motion.div>

            {/* Payment Settings */}
            <motion.div
              variants={itemVariants}
              className="bg-card rounded-xl border border-border overflow-hidden"
            >
              <button
                onClick={() => navigate("/wallet")}
                className="w-full flex items-center gap-3 p-4 min-h-[64px] hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm">{t("profilehub.payment_settings")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("profilehub.payment_settings_desc")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </motion.div>

            {/* Addresses */}
            <motion.div
              variants={itemVariants}
              className="bg-card rounded-xl border border-border overflow-hidden"
            >
              <button
                onClick={() => navigate("/addresses")}
                className="w-full flex items-center gap-3 p-4 min-h-[64px] hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                <div className="h-11 w-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-rose-500" aria-hidden="true" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm">{t("profilehub.addresses")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("profilehub.addresses_desc")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </motion.div>

            {/* Privacy & Security */}
            <motion.div
              variants={itemVariants}
              className="bg-card rounded-xl border border-border overflow-hidden"
            >
              <button
                onClick={() => navigate("/legal")}
                className="w-full flex items-center gap-3 p-4 min-h-[64px] hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                <div className="h-11 w-11 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-slate-500" aria-hidden="true" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm">{t("profilehub.privacy")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("profilehub.privacy_desc")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </motion.div>

            {/* Notifications placeholder */}
            <motion.div
              variants={itemVariants}
              className="bg-card rounded-xl border border-border overflow-hidden"
            >
              <button
                onClick={() => toast.info(t("profilehub.notifications_soon"))}
                className="w-full flex items-center gap-3 p-4 min-h-[64px] hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                <div className="h-11 w-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <BellRing className="h-5 w-5 text-blue-500" aria-hidden="true" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm">{t("profilehub.notifications")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("profilehub.notifications_desc")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </motion.div>

            {/* Theme placeholder */}
            <motion.div
              variants={itemVariants}
              className="bg-card rounded-xl border border-border overflow-hidden"
            >
              <button
                onClick={() => toast.info(t("profilehub.theme_soon"))}
                className="w-full flex items-center gap-3 p-4 min-h-[64px] hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                <div className="h-11 w-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Palette className="h-5 w-5 text-purple-500" aria-hidden="true" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-sm">{t("profilehub.theme")}</p>
                  <p className="text-[11px] text-muted-foreground">{t("profilehub.theme_desc")}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </motion.div>

            {/* Trust footer in security tab */}
            <motion.div
              variants={itemVariants}
              className="bg-card rounded-xl border border-border p-4 space-y-2"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
                <span className="font-semibold">{t("settings.trust_encrypted")}</span>
              </div>
              <p className="text-[10px] text-muted-foreground pl-5">
                {t("settings.trust_encrypted_desc")}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
                <span className="font-semibold">{t("settings.trust_misau_registered")}</span>
              </div>
              <p className="text-[10px] text-muted-foreground pl-5">
                {t("settings.trust_misau_desc")}
              </p>
            </motion.div>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════ */}
      {/* LOGOUT                                     */}
      {/* ═══════════════════════════════════════════ */}
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
        onClick={handleLogout}
      >
        <LogOut className="h-5 w-5" aria-hidden="true" />
        {t("profile.logout")}
      </Button>

      <p className="text-center text-xs text-muted-foreground">{t("profile.version_label")}</p>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("profile.edit_profile")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block" htmlFor="edit-name">
                {t("profile.full_name")}
              </label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t("profile.placeholder_name")}
                className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block" htmlFor="edit-phone">
                {t("profile.phone")}
              </label>
              <Input
                id="edit-phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder={t("profile.placeholder_phone")}
                className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />
                  {t("profile.saving")}
                </>
              ) : (
                t("common.save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
