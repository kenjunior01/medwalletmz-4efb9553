import { Button } from '@/components/ui/button';
import { ArrowLeft, Globe, Heart, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  step: number;
  totalSteps: number;
  onBack?: () => void;
  colorClassName?: string;
  countryName?: string;
}

export function OnboardingLayout({
  children,
  title,
  subtitle,
  step,
  totalSteps,
  onBack,
  colorClassName = "bg-primary",
  countryName = "Moçambique"
}: OnboardingLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col relative overflow-x-hidden font-sans selection:bg-primary/20">
      {/* Background Decorativo */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-secondary/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <header className="relative z-20 flex items-center justify-between bg-white/50 backdrop-blur-md px-6 py-4 border-b border-white/40 shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack || (() => navigate(-1))}
            className="rounded-2xl bg-white/50 hover:bg-white transition-all shadow-sm group"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          </Button>
          <div>
            <h1 className="text-lg font-black tracking-tight">{title}</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">{subtitle}</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 bg-white/50 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-white/40">
          <Globe className="h-4 w-4 text-secondary" />
          <span className="text-[10px] font-black uppercase tracking-wider">{countryName}</span>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-2xl mx-auto w-full p-6 pb-32">
        {/* Progress Bar Premium */}
        <div className="flex gap-2 mb-10">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="flex-1 space-y-2">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-all duration-700",
                  i + 1 <= step ? colorClassName : "bg-muted"
                )}
              />
              <p className={cn(
                "text-[8px] font-black uppercase tracking-tighter text-center",
                i + 1 === step ? "text-foreground" : "text-muted-foreground opacity-50"
              )}>
                {i + 1 === step ? `Passo ${step}` : ""}
              </p>
            </div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Footer Decorativo */}
      <footer className="relative z-10 p-8 text-center mt-auto">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Heart className="h-3 w-3 text-destructive fill-current" />
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
            MedWallet MZ • Ecossistema de Saúde Digital
          </span>
        </div>
      </footer>
    </div>
  );
}
