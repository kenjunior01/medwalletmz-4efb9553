import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  IdCard, Heart, FileText, ChevronRight, CheckCircle2,
} from '@/components/icons/lucide-compat';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCountry } from "@/contexts/CountryContext";
import { containerVariants, itemVariants } from './constants';

interface HealthTabProps {
  misauLinked: boolean;
  documentsLabel: string;
}

export function HealthTab({ misauLinked, documentsLabel }: HealthTabProps) {
  const navigate = useNavigate();
  const { t } = useCountry();

  return (
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
  );
}
