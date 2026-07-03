import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, Stethoscope, Pill, ClipboardList, ArrowLeft, Search, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

const suggestions = [
  { to: "/", label: "Início", icon: Home, tone: "from-primary/20 to-primary/5" },
  { to: "/health/doctors", label: "Médicos", icon: Stethoscope, tone: "from-secondary/20 to-secondary/5" },
  { to: "/pharmacy", label: "Farmácias", icon: Pill, tone: "from-emerald-500/20 to-emerald-500/5" },
  { to: "/orders", label: "Pedidos", icon: ClipboardList, tone: "from-amber-500/20 to-amber-500/5" },
  { to: "/health/triage", label: "Triagem IA", icon: Search, tone: "from-fuchsia-500/20 to-fuchsia-500/5" },
  { to: "/health/exams", label: "Exames", icon: Compass, tone: "from-cyan-500/20 to-cyan-500/5" },
];

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.warn("404:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-10 bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <div className="max-w-2xl w-full text-center">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-2xl mb-6 rotate-3">
          <Compass className="h-10 w-10" />
        </div>
        <h1 className="text-6xl font-black tracking-tight bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent">
          404
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Essa página ainda não existe no MedWallet. Talvez uma destas te leve onde precisas:
        </p>
        <code className="mt-2 inline-block text-xs text-muted-foreground/70 bg-muted/50 px-2 py-1 rounded">
          {location.pathname}
        </code>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3">
          {suggestions.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className={`group rounded-2xl p-4 bg-gradient-to-br ${s.tone} border border-border/40 hover:border-primary/40 hover:-translate-y-0.5 transition-all`}
            >
              <s.icon className="h-6 w-6 mx-auto mb-2 text-foreground/80 group-hover:text-primary transition-colors" />
              <span className="text-sm font-semibold">{s.label}</span>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
          </Button>
          <Button onClick={() => navigate("/")}>
            <Home className="h-4 w-4 mr-1.5" /> Ir para o Início
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
