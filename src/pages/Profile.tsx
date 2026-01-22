import { User, MapPin, CreditCard, Bell, HelpCircle, LogOut, ChevronRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const menuItems = [
  { icon: MapPin, label: "Meus Endereços", href: "/addresses" },
  { icon: CreditCard, label: "Métodos de Pagamento", href: "/payments" },
  { icon: Bell, label: "Notificações", href: "/notifications" },
  { icon: Settings, label: "Configurações", href: "/settings" },
  { icon: HelpCircle, label: "Ajuda & Suporte", href: "/help" },
];

export default function Profile() {
  return (
    <div className="flex flex-col gap-6 p-4 animate-fade-in">
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
          <User className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Visitante</h1>
          <p className="text-sm text-muted-foreground">Faça login para continuar</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-full">
          Entrar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <p className="text-2xl font-bold text-primary">0</p>
          <p className="text-xs text-muted-foreground">Pedidos</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <p className="text-2xl font-bold text-secondary">0</p>
          <p className="text-xs text-muted-foreground">Favoritos</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <p className="text-2xl font-bold text-accent">0</p>
          <p className="text-xs text-muted-foreground">Cupons</p>
        </div>
      </div>

      {/* Menu */}
      <div className="bg-card rounded-xl border border-border divide-y divide-border">
        {menuItems.map(({ icon: Icon, label, href }) => (
          <button
            key={label}
            className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
          >
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1 text-left font-medium text-sm">{label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10">
        <LogOut className="h-5 w-5" />
        Terminar Sessão
      </Button>

      {/* App Version */}
      <p className="text-center text-xs text-muted-foreground">
        MoçambiApp v1.0.0
      </p>
    </div>
  );
}
