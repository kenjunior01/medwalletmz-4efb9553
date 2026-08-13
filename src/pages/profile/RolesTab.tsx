import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Briefcase, ChevronRight, PlusCircle, ShieldCheck,
} from '@/components/icons/lucide-compat';
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import { containerVariants, itemVariants, INSTITUTION_ROLES } from './constants';

export function RolesTab() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { t } = useCountry();

  const activeInstitutions = INSTITUTION_ROLES.filter((ir) => hasRole(ir.role));
  const availableRoles = INSTITUTION_ROLES.filter((ir) => !hasRole(ir.role));

  return (
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
        {availableRoles.map((inst) => {
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
  );
}