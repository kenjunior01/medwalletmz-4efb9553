import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, X, Menu, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePopupCoordinator } from '@/components/layout/PopupCoordinator';
import { useCountry } from '@/contexts/CountryContext';

const DISMISS_KEY = 'mz_visitor_pro_onboarding_dismissed';

/**
 * Banner leve que guia visitantes/pacientes até ao ponto de registo
 * como Profissional de Saúde a partir do menu lateral.
 * — Não intrusivo, uma única vez, dispensável para sempre.
 * — Integrated with PopupCoordinator to avoid overlap with popups.
 */
export function VisitorProOnboarding() {
  const navigate = useNavigate();
  const { t } = useCountry();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const { activePopup, release } = usePopupCoordinator();

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === '1') return;
    const timeout = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(timeout);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
    release('onboarding');
  };

  if (!visible) return null;
  // Hide if a higher-priority popup is active
  if (activePopup && activePopup !== 'onboarding') return null;

  return (
    <div className="px-4 mt-4">
      <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 shadow-sm">
        <button
          onClick={dismiss}
          aria-label={t('common.close')}
          className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:bg-muted/60"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary/15 text-primary grid place-items-center shrink-0">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-1.5">
              <p className="font-black text-sm leading-tight">{t('home.are_you_professional')}</p>
              <Sparkles className="h-3 w-3 text-amber-500" />
            </div>

            {step === 1 ? (
              <>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {t('visitor_pro.register_desc')}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => navigate('/doctor/register')}
                    className="gap-1.5 font-bold"
                  >
                    {t('visitor_pro.register_now')} <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="gap-1.5"
                  >
                    <Menu className="h-3.5 w-3.5" /> {t('visitor_pro.show_in_menu')}
                  </Button>
                  <button
                    onClick={dismiss}
                    className="text-xs text-muted-foreground hover:underline px-2 self-center"
                  >
                    {t('visitor_pro.dont_show_again')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <ol className="text-xs text-muted-foreground mt-1 space-y-1 leading-relaxed list-decimal list-inside">
                  <li>{t('visitor_pro.step_1')} <Menu className="inline h-3 w-3 -mt-0.5" /></li>
                  <li>{t('visitor_pro.step_2')}</li>
                  <li>{t('visitor_pro.step_3')}</li>
                </ol>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => navigate('/doctor/register')}
                    className="gap-1.5 font-bold"
                  >
                    {t('visitor_pro.go_direct')} <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={dismiss}>
                    {t('visitor_pro.understood')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
