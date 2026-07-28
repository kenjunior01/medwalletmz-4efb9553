/**
 * UserTypeSelector — presented during registration
 *
 * Lets the new user pick their primary type:
 *   patient | rider | worker | caregiver | promoter
 *
 * The choice personalizes the home dashboard, quick-access rail,
 * and what onboarding wizard runs next.
 */

import { motion } from 'framer-motion';
import { Check, ChevronRight } from '@/components/icons/lucide-compat';
import { useCountry } from '@/contexts/CountryContext';
import { USER_TYPES, UserType } from '@/services/userTypes';

interface Props {
  value: UserType | null;
  onChange: (t: UserType) => void;
}

export function UserTypeSelector({ value, onChange }: Props) {
  const { t } = useCountry();

  return (
    <div className="space-y-3" role="radiogroup" aria-label={t('userType.ariaLabel')}>
      <div>
        <p className="font-black text-[10px] uppercase tracking-widest text-primary/60 ml-2">
          {t('userType.label')}
        </p>
        <p className="text-[10px] text-muted-foreground ml-2 mt-0.5">
          {t('userType.hint')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {USER_TYPES.map((opt, idx) => {
          const isSelected = value === opt.id;
          return (
            <motion.button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.04, 0.2) }}
              onClick={() => onChange(opt.id)}
              className={`relative flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                isSelected
                  ? `${opt.border} bg-gradient-to-br ${opt.bg} ring-2 ring-offset-1`
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span className="text-2xl shrink-0" aria-hidden>{opt.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${opt.color}`}>
                  {t(opt.labelKey)}
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">
                  {t(opt.descriptionKey)}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                  {t(opt.featuresKey)}
                </p>
              </div>
              {isSelected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute top-2 right-2 inline-flex h-5 w-5 items-center justify-center rounded-full ${opt.color.replace('text-', 'bg-')} text-white`}
                >
                  <Check className="h-3 w-3" />
                </motion.span>
              )}
              {!isSelected && (
                <ChevronRight className="absolute top-3 right-3 h-3.5 w-3.5 text-slate-300" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
