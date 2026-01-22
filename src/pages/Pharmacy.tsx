import { useState } from "react";
import { Search, Pill, Heart, Thermometer, Droplet, Shield, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const categories = [
  { icon: Pill, label: "Dor", color: "text-red-500" },
  { icon: Thermometer, label: "Gripe", color: "text-blue-500" },
  { icon: Heart, label: "Coração", color: "text-pink-500" },
  { icon: Droplet, label: "Vitaminas", color: "text-orange-500" },
  { icon: Shield, label: "Imunidade", color: "text-green-500" },
  { icon: Sparkles, label: "Beleza", color: "text-purple-500" },
];

const mockMedicines = [
  { id: 1, name: "Paracetamol 500mg", price: 85, category: "Dor", prescription: false },
  { id: 2, name: "Ibuprofeno 400mg", price: 120, category: "Dor", prescription: false },
  { id: 3, name: "Vitamina C 1000mg", price: 250, category: "Vitaminas", prescription: false },
  { id: 4, name: "Antigripal Plus", price: 180, category: "Gripe", prescription: false },
  { id: 5, name: "Multivitamínico", price: 450, category: "Vitaminas", prescription: false },
  { id: 6, name: "Protetor Solar SPF50", price: 350, category: "Beleza", prescription: false },
];

export default function Pharmacy() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredMedicines = activeCategory
    ? mockMedicines.filter((m) => m.category === activeCategory)
    : mockMedicines;

  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Farmácia</h1>
        <p className="text-muted-foreground text-sm">Medicamentos e produtos de saúde</p>
      </div>

      {/* Express Delivery Banner */}
      <div className="bg-pharmacy/10 rounded-xl p-4 flex items-center gap-3">
        <div className="p-2 bg-pharmacy/20 rounded-lg">
          <Pill className="h-6 w-6 text-pharmacy" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Entrega Expressa</h3>
          <p className="text-xs text-muted-foreground">Medicamentos em até 1 hora</p>
        </div>
        <Badge className="bg-pharmacy text-white">24h</Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pesquisar medicamentos..."
          className="pl-10 h-11 rounded-xl"
        />
      </div>

      {/* Categories */}
      <div className="flex overflow-x-auto gap-3 no-scrollbar -mx-4 px-4">
        {categories.map(({ icon: Icon, label, color }) => (
          <button
            key={label}
            onClick={() => setActiveCategory(activeCategory === label ? null : label)}
            className={`flex flex-col items-center gap-1.5 p-3 min-w-[72px] rounded-xl transition-all ${
              activeCategory === label
                ? "bg-pharmacy/20 ring-2 ring-pharmacy"
                : "bg-card border border-border"
            }`}
          >
            <Icon className={`h-6 w-6 ${color}`} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Products */}
      <div className="flex flex-col gap-3">
        {filteredMedicines.map((medicine) => (
          <div
            key={medicine.id}
            className="bg-card rounded-xl border border-border p-3 flex gap-3 transition-all hover:shadow-medium"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-pharmacy/20 to-pharmacy/5 rounded-lg flex-shrink-0 flex items-center justify-center">
              <Pill className="h-8 w-8 text-pharmacy/50" />
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-medium text-sm">{medicine.name}</h3>
                <p className="text-xs text-muted-foreground">{medicine.category}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-pharmacy">{medicine.price} MZN</span>
                <Button size="sm" className="h-7 text-xs rounded-full bg-pharmacy hover:bg-pharmacy/90">
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
