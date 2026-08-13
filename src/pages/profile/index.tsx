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
import { toast } from "sonner";
import {
  Wallet, MapPin, HelpCircle, Gift, PlusCircle, Crown, ShieldCheck,
  LayoutDashboard, LogOut,
} from '@/components/icons/lucide-compat';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/lib/logger';

import { containerVariants, INSTITUTION_ROLES } from './constants';
import type { Profile, Stats, MenuItem, CompletionStep } from './types';
import { ProfileHeader } from './ProfileHeader';
import { ProfileCompletion } from './ProfileCompletion';
import { PersonalTab } from './PersonalTab';
import { HealthTab } from './HealthTab';
import { DocumentsTab } from './DocumentsTab';
import { RolesTab } from './RolesTab';
import { SecurityTab } from './SecurityTab';
import { ProfileEditDialog } from './ProfileEditDialog';
import { ProfileGuestView } from './ProfileGuestView';
import { ProfileLoadingSkeleton } from './ProfileLoadingSkeleton';
import { ProfileErrorState } from './ProfileErrorState';

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
  const [stats, setStats] = useState<Stats>({ orders: 0, prescriptions: 0, coupons: 0, documents: 0 });
  const [misauLinked, setMisauLinked] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isManager = hasRole("country_manager") || hasRole("admin");

  const menuItems: MenuItem[] = [
    { icon: Wallet, label: t("profile.menu.wallet"), href: "/wallet" },
    { icon: MapPin, label: t("profile.menu.addresses"), href: "/addresses" },
    ...(isManager
      ? [{ icon: LayoutDashboard, label: t("profile.regional_panel"), href: "/manager", highlight: true } as MenuItem]
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
         
        .rpc("get_profile_private" as any, { _user_id: user.id } as any);
       
      if (rpcError && (rpcError as any).code !== "PGRST116") throw rpcError;
       
      const data: any = Array.isArray(rows) ? rows[0] : rows;
      if (data) {
        setProfile(data);
        setEditName(data.full_name || "");
        setEditPhone(data.phone || "");
      }
    } catch (error) {
      logger.error("Erro ao carregar perfil:", { error: error });
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
       
      const docsRes: any = await supabase
        .from("medical_records")
        .select("id", { count: "exact", head: true })
        .eq("patient_id", user.id);

      // MISAU / patient profile check
       
      const ppRes: any = await supabase
        .from("patient_profiles")
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
      logger.error("Erro ao carregar estatísticas:", { error: error });
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
      logger.error("Erro ao atualizar perfil:", { error: error });
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
      logger.error("Avatar upload error:", { error: err });
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

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    fetchProfile();
    fetchStats();
  };

  // Compute active institution roles (used for completion percentage)
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

  const completionSteps: CompletionStep[] = [
    { done: Boolean(user?.email), label: t("profile.completion_step_email") },
    { done: Boolean(profile?.full_name), label: t("profile.completion_step_name") },
    { done: Boolean(profile?.phone), label: t("profile.completion_step_phone") },
    { done: Boolean(profile?.avatar_url), label: t("profile.completion_step_avatar") },
    { done: activeInstitutions.length > 0, label: t("profile.completion_step_role") },
  ];

  // ─── Guest view ────────────────────────────────────────────────────────
  if (!user) {
    return <ProfileGuestView menuItems={menuItems} />;
  }

  // ─── Loading skeleton (role="status") ──────────────────────────────────
  if (loading) {
    return <ProfileLoadingSkeleton />;
  }

  // ─── Error state (role="alert") ────────────────────────────────────────
  if (error) {
    return <ProfileErrorState onRetry={handleRetry} />;
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
      {/* PROFILE HEADER + TRUST BADGES */}
      <ProfileHeader
        profile={profile}
        displayName={displayName}
        userEmail={user.email}
        avatarUploading={avatarUploading}
        onAvatarClick={handleAvatarClick}
        onAvatarChange={handleAvatarChange}
        fileInputRef={fileInputRef}
        onEditClick={() => setEditOpen(true)}
        misauLinked={misauLinked}
      />

      {/* ACCOUNT COMPLETION */}
      <ProfileCompletion completion={completion} completionSteps={completionSteps} />

      {/* TABS */}
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

        <TabsContent value="personal">
          <PersonalTab
            stats={stats}
            hasStats={hasStats}
            menuItems={menuItems}
            userId={user.id}
          />
        </TabsContent>

        <TabsContent value="health">
          <HealthTab misauLinked={misauLinked} documentsLabel={documentsLabel} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab
            documentsCount={documentsCount}
            documentsLabel={documentsLabel}
            prescriptionsCount={stats.prescriptions}
          />
        </TabsContent>

        <TabsContent value="roles">
          <RolesTab />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
      </Tabs>

      {/* LOGOUT */}
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
      <ProfileEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editName={editName}
        onNameChange={setEditName}
        editPhone={editPhone}
        onPhoneChange={setEditPhone}
        saving={saving}
        onSave={handleSaveProfile}
      />
    </motion.div>
  );
}
