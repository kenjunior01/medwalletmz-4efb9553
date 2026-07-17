import { Sparkles, ArrowLeft, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ComingSoonProps {
  title: string;
  description?: string;
  eta?: string;
  features?: string[];
}

export default function ComingSoon({
  title,
  description = "Estamos a preparar esta funcionalidade com carinho para Moçambique.",
  eta = "Brevemente",
  features = [],
}: ComingSoonProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] px-4 pt-4 pb-10 animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="relative rounded-[2rem] overflow-hidden gradient-ocean p-7 text-white shadow-premium">
        <div className="absolute -top-10 -right-8 w-44 h-44 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-10 w-52 h-52 rounded-full bg-secondary/30 blur-3xl" />
        <div className="relative">
          <Badge className="bg-gold text-gold-foreground border-0 mb-3">{eta}</Badge>
          <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-4">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-black leading-tight">{title}</h1>
          <p className="text-sm opacity-90 mt-3 max-w-[320px]">{description}</p>

          <Button
            size="sm"
            className="mt-5 bg-white text-primary hover:bg-white/90 font-bold"
            onClick={() => toast.success("Boa! Vamos avisar-te assim que estiver pronto.")}
          >
            <BellRing className="h-4 w-4 mr-1.5" /> Avisar-me quando lançar
          </Button>
        </div>
      </div>

      {features.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
            O que vais poder fazer
          </h2>
          <div className="grid gap-2">
            {features.map((f) => (
              <div key={f} className="bento-card p-4 flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-secondary/15 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-secondary" />
                </div>
                <p className="text-sm leading-snug">{f}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 text-center">
        <Button variant="outline" onClick={() => navigate("/")}>
          Voltar ao início
        </Button>
      </div>
    </div>
  );
}