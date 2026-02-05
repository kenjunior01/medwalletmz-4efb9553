import { LucideIcon, UtensilsCrossed, ShoppingBasket, Pill, Truck, Sparkles, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BentoItemProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  href: string;
  className?: string;
  iconBg?: string;
  iconColor?: string;
  featured?: boolean;
}

function BentoItem({ icon: Icon, title, subtitle, href, className, iconBg, iconColor, featured }: BentoItemProps) {
  const navigate = useNavigate();
  
  return (
    <button
      onClick={() => navigate(href)}
      className={cn(
        "relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-300",
        "hover:scale-[1.02] hover:shadow-premium active:scale-[0.98]",
        "group",
        featured ? "glass border border-primary/20" : "bg-card border border-border/50",
        className
      )}
    >
      {featured && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      )}
      
      <div className="relative z-10 flex flex-col h-full">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110",
          iconBg || "bg-primary/10"
        )}>
          <Icon className={cn("h-6 w-6", iconColor || "text-primary")} />
        </div>
        
        <h3 className="font-bold text-base mb-0.5">{title}</h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
        
        {featured && (
          <div className="absolute top-3 right-3">
            <div className="bg-secondary text-secondary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" />
              Popular
            </div>
          </div>
        )}
      </div>
      
      {/* Hover effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export function BentoGrid() {
  return (
    <section className="px-4">
      <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
        <span className="w-1.5 h-6 bg-primary rounded-full" />
        O que procuras hoje?
      </h2>
      
      {/* Bento Grid Layout - Asymmetric */}
      <div className="grid grid-cols-2 gap-3">
        {/* Featured - Food (larger) */}
        <BentoItem
          icon={UtensilsCrossed}
          title="Comida"
          subtitle="Restaurantes & Fast Food"
          href="/food"
          className="col-span-2 row-span-1 min-h-[100px]"
          iconBg="gradient-warm"
          iconColor="text-white"
          featured
        />
        
        {/* Grocery */}
        <BentoItem
          icon={ShoppingBasket}
          title="Mercado"
          subtitle="Supermercados"
          href="/grocery"
          className="min-h-[120px]"
          iconBg="bg-grocery/10"
          iconColor="text-grocery"
        />
        
        {/* Pharmacy */}
        <BentoItem
          icon={Pill}
          title="Farmácia"
          subtitle="Medicamentos"
          href="/pharmacy"
          className="min-h-[120px]"
          iconBg="bg-pharmacy/10"
          iconColor="text-pharmacy"
        />
        
        {/* Express Delivery */}
        <BentoItem
          icon={Truck}
          title="Expresso"
          subtitle="Entrega rápida"
          href="/food"
          className="min-h-[100px]"
          iconBg="bg-secondary/10"
          iconColor="text-secondary"
        />
        
        {/* Promos */}
        <BentoItem
          icon={Gift}
          title="Promoções"
          subtitle="Ofertas especiais"
          href="/food"
          className="min-h-[100px]"
          iconBg="bg-accent/10"
          iconColor="text-accent"
        />
      </div>
    </section>
  );
}
