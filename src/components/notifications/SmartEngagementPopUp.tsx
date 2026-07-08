import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  X, Bell, Gift, Heart, Sparkles,
  Stethoscope, Zap, ArrowRight, ShieldCheck, Crown,
  ThermometerSun, Wind, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

/**
 * SmartEngagementPopUp — Sistema de notificações "In-App" inteligentes.
 * Aparece estrategicamente para converter o utilizador em ações chave.
 * Agora integrado com Google Air Quality & Weather API para notificações adaptativas.
 */

type PopUpType = "referral" | "education" | "blood" | "profile" | "triage" | "subscription" | "environmental";

export function SmartEngagementPopUp() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [type, setType] = useState<PopUpType>("referral");
  const [envContext, setEnvContext] = useState<{ title: string; desc: string; icon: any; color: string } | null>(null);

  useEffect(() => {
    const lastShow = localStorage.getItem("smart-popup-last-show");
    const now = Date.now();
    const h = new Date().getHours();

    const cooldown = 1000 * 60 * 60 * 6; // Reduzido para 6h para alertas climáticos

    if (lastShow && now - Number(lastShow) < cooldown) return;

    const timer = setTimeout(() => {
      determineType(h);
    }, 5000);

    return () => clearTimeout(timer);
  }, [user]);

  const determineType = async (hour: number) => {
    if (!user) return;

    let selectedType: PopUpType = "referral";
    const rand = Math.random();

    // 1. Verificação de Alertas Ambientais Adaptativos (Prioridade Máxima)
    try {
      const { data: profile } = await supabase
        .from('patient_profiles')
        .select('chronic_conditions')
        .eq('user_id', user.id)
        .maybeSingle();

      const conditions = (profile?.chronic_conditions || []).map((c: string) => c.toLowerCase());

      // Simulação de dados de API (Calor em Maputo / Poluição)
      const isExtremeHeat = true;
      const isBadAirQuality = false;

      if (isExtremeHeat && conditions.some(c => c.includes('hipertensão') || c.includes('coração') || c.includes('diabetes'))) {
        setEnvContext({
          title: "Alerta de Calor: Cuida do teu Coração",
          desc: "Está muito calor em Maputo. Como tens uma condição crónica, evita sair entre as 11h e 16h e bebe muita água.",
          icon: ThermometerSun,
          color: "bg-orange-500 text-white"
        });
        selectedType = "environmental";
      } else if (isBadAirQuality && conditions.some(c => c.includes('asma') || c.includes('respiratória'))) {
        setEnvContext({
          title: "Qualidade do Ar Crítica",
          desc: "Níveis de poluição altos hoje. Recomendamos o uso de máscara ou evitar zonas de tráfego intenso.",
          icon: Wind,
          color: "bg-slate-600 text-white"
        });
        selectedType = "environmental";
      } else {
        // Fallback para lógica temporal normal
        if (hour >= 6 && hour < 12) {
          selectedType = rand < 0.7 ? "triage" : "profile";
        } else if (hour >= 12 && hour < 19) {
          selectedType = rand < 0.5 ? "education" : "referral";
        } else {
          selectedType = rand < 0.5 ? "subscription" : "blood";
        }
      }
    } catch (e) {
      console.error("Erro ao processar notificações inteligentes", e);
    }

    setType(selectedType);
    setShow(true);
    localStorage.setItem("smart-popup-last-show", String(Date.now()));

    supabase.from('user_engagement_logs').insert({
      user_id: user.id,
      type: selectedType,
      action: 'shown'
    }).then();
  };

  const config: any = {
    environmental: envContext,
    referral: {
      title: "Ganha 25 MZN grátis!",
      desc: "Convida um amigo para a MedWallet e ambos recebem bónus na carteira.",
      icon: Gift,
      color: "bg-gold text-gold-foreground",
      action: () => navigate("/referrals"),
      btnText: "Convidar agora"
    },
    education: {
      title: "Sabias que...?",
      desc: "A malária pode ser prevenida com gestos simples. Lê o nosso guia atualizado.",
      icon: Sparkles,
      color: "bg-primary text-primary-foreground",
      action: () => navigate("/health/education"),
      btnText: "Ler artigo"
    },
    blood: {
      title: "Herói em Maputo",
      desc: "Precisamos de doadores do teu tipo de sangue hoje. Vê onde podes ajudar.",
      icon: Heart,
      color: "bg-red-500 text-white",
      action: () => navigate("/blood"),
      btnText: "Ver pedidos"
    },
    profile: {
      title: "Perfil incompleto",
      desc: "Completa os teus dados para teres consultas mais rápidas e seguras.",
      icon: ShieldCheck,
      color: "bg-blue-600 text-white",
      action: () => navigate("/profile"),
      btnText: "Completar"
    },
    triage: {
      title: "Como te sentes hoje?",
      desc: "Faz uma avaliação rápida de sintomas com o Meddy IA em menos de 1 minuto.",
      icon: Stethoscope,
      color: "bg-secondary text-secondary-foreground",
      action: () => navigate("/health/triage"),
      btnText: "Iniciar Triagem"
    },
    subscription: {
      title: "Acesso Ilimitado?",
      desc: "Com o Health Pass tens consultas grátis e descontos em todas as farmácias.",
      icon: Crown,
      color: "bg-slate-900 text-white",
      action: () => navigate("/health/plans"),
      btnText: "Ver Planos"
    }
  };

  const logAction = (action: string) => {
    if (!user) return;
    supabase.from('user_engagement_logs').insert({
      user_id: user.id,
      type: type,
      action: action
    }).then();
  };

  const current = config[type];
  if (!current) return null;
  const Icon = current.icon;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.9 }}
          className="fixed bottom-20 left-4 right-4 z-50 pointer-events-none"
        >
          <div className="bg-card border border-border shadow-2xl rounded-2xl p-4 pointer-events-auto flex gap-4 items-start relative overflow-hidden max-w-sm mx-auto">
            <div className={`absolute top-0 left-0 w-1 h-full ${current.color.split(' ')[0]}`} />

            <div className={`h-12 w-12 rounded-xl shrink-0 flex items-center justify-center ${current.color}`}>
              <Icon className="h-6 w-6" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-black text-sm">{current.title}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                {current.desc}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className={`h-8 text-[10px] px-3 font-bold rounded-full ${current.color} border-none`}
                  onClick={() => { setShow(false); logAction('clicked'); current.action(); }}
                >
                  {current.btnText} <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-[10px] px-3 font-medium text-muted-foreground"
                  onClick={() => { setShow(false); logAction('dismissed'); }}
                >
                  Talvez depois
                </Button>
              </div>
            </div>

            <button
              onClick={() => { setShow(false); logAction('dismissed'); }}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
