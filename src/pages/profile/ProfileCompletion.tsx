import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight } from '@/components/icons/lucide-compat';
import { Progress } from "@/components/ui/progress";
import { useCountry } from "@/contexts/CountryContext";
import { itemVariants } from './constants';
import type { CompletionStep } from './types';

interface ProfileCompletionProps {
  completion: number;
  completionSteps: CompletionStep[];
}

export function ProfileCompletion({ completion, completionSteps }: ProfileCompletionProps) {
  const { t } = useCountry();

  return (
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
  );
}
