import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Globe, Key, CreditCard, MapPin, Lock, BellRing, Palette, ChevronRight, ShieldCheck,
} from '@/components/icons/lucide-compat';
import { LowDataToggle } from "@/components/profile/LowDataToggle";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { useCountry } from "@/contexts/CountryContext";
import { containerVariants, itemVariants } from './constants';

export function SecurityTab() {
  const navigate = useNavigate();
  const { t } = useCountry();

  return (
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
  );
}