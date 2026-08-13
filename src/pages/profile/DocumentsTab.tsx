import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, FileCheck2, ChevronRight,
} from '@/components/icons/lucide-compat';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCountry } from '@/contexts/CountryContext';
import { containerVariants, itemVariants } from './constants';

interface DocumentsTabProps {
  documentsCount: number;
  documentsLabel: string;
  prescriptionsCount: number;
}

export function DocumentsTab({ documentsCount, documentsLabel, prescriptionsCount }: DocumentsTabProps) {
  const navigate = useNavigate();
  const { t } = useCountry();

  return (
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
                {t("profile.documents_count", { count: String(prescriptionsCount) })}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
