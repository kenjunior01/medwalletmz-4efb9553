import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User, Package, FileText, Ticket, ChevronRight,
} from '@/components/icons/lucide-compat';
import { Button } from "@/components/ui/button";
import { useCountry } from "@/contexts/CountryContext";
import { containerVariants, itemVariants } from './constants';
import type { MenuItem } from './types';

interface ProfileGuestViewProps {
  menuItems: MenuItem[];
}

export function ProfileGuestView({ menuItems }: ProfileGuestViewProps) {
  const navigate = useNavigate();
  const { t } = useCountry();

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