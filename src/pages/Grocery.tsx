import { useState } from "react";
import { Search, Apple, Carrot, Milk, Package, Droplets, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const categories = [
  { icon: Apple, label: "Frutas", color: "text-green-600" },
  { icon: Carrot, label: "Vegetais", color: "text-orange-500" },
  { icon: Milk, label: "Laticínios", color: "text-blue-500" },
  { icon: Package, label: "Mercearia", color: "text-amber-600" },
  { icon: Droplets, label: "Bebidas", color: "text-cyan-500" },
  { icon: Sparkles, label: "Limpeza", color: "text-purple-500" },
];

const mockProducts = [
  { id: 1, name: "Banana Madura", price: 45, unit: "kg", category: "Frutas" },
  { id: 2, name: "Tomate Fresco", price: 80, unit: "kg", category: "Vegetais" },
  { id: 3, name: "Leite 1L", price: 120, unit: "un", category: "Laticínios" },
  { id: 4, name: "Arroz 5kg", price: 350, unit: "un", category: "Mercearia" },
  { id: 5, name: "Água 5L", price: 65, unit: "un", category: "Bebidas" },
  { id: 6, name: "Detergente", price: 95, unit: "un", category: "Limpeza" },
];

export default function Grocery() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredProducts = activeCategory
    ? mockProducts.filter((p) => p.category === activeCategory)
    : mockProducts;

  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Supermercado</h1>
        <p className="text-muted-foreground text-sm">Produtos frescos entregues em casa</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pesquisar produtos..."
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
                ? "bg-grocery/20 ring-2 ring-grocery"
                : "bg-card border border-border"
            }`}
          >
            <Icon className={`h-6 w-6 ${color}`} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Active filter indicator */}
      {activeCategory && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            {activeCategory}
            <button
              onClick={() => setActiveCategory(null)}
              className="ml-1 hover:text-destructive"
            >
              ×
            </button>
          </Badge>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-card rounded-xl border border-border p-3 flex flex-col gap-2 transition-all hover:shadow-medium"
          >
            <div className="h-24 bg-gradient-to-br from-grocery/20 to-grocery/5 rounded-lg" />
            <div>
              <h3 className="font-medium text-sm">{product.name}</h3>
              <p className="text-xs text-muted-foreground">{product.category}</p>
            </div>
            <div className="flex items-center justify-between mt-auto">
              <span className="font-bold text-grocery">
                {product.price} MZN
                <span className="text-xs font-normal text-muted-foreground">
                  /{product.unit}
                </span>
              </span>
              <Button size="sm" className="h-7 w-7 p-0 rounded-full bg-grocery hover:bg-grocery/90">
                +
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
