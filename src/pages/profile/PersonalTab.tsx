import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Package, FileText, Ticket, Briefcase, ChevronRight, Award,
} from '@/components/icons/lucide-compat';
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCountry } from "@/contexts/CountryContext";
import { UserProposalsWidget } from "@/components/places/UserProposalsWidget";
import { containerVariants, itemVariants } from './constants';
import type { Stats, MenuItem } from './types';

interface PersonalTabProps {
  stats: Stats;
  hasStats: boolean;
  menuItems: MenuItem[];
  userId: string;
}

export function PersonalTab({ stats, hasStats, menuItems, userId }: PersonalTabProps) {
  const navigate = useNavigate();
  const { country, t } = useCountry();

  return (
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
        <UserProposalsWidget userId={userId} />
      </motion.div>
    </motion.div>
  );
}
