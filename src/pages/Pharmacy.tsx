import { useState, useEffect } from "react";
import { useNavigate, useLocation as useRouterLocation } from "react-router-dom";
import { Search, Pill, Star, Clock, FileText, X, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "@/contexts/LocationContext";
import { Tables } from "@/integrations/supabase/types";

type Store = Tables<"stores">;

const filters = ["Todas", "24h", "Melhor Avaliado", "Próximo"];

export default function Pharmacy() {
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const { city: selectedCity } = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todas");
  const [pharmacies, setPharmacies] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePrescription, setActivePrescription] = useState<string | null>(null);
  const [showAllCities, setShowAllCities] = useState(false);

  useEffect(() => {
    const fromState = (routerLocation.state as any)?.prescription_id as string | undefined;
    if (fromState) {
      sessionStorage.setItem('active_prescription', JSON.stringify({ id: fromState, priority: true }));
      setActivePrescription(fromState);
      return;
    }
    const stored = sessionStorage.getItem('active_prescription');
    if (stored) {
      try { setActivePrescription(JSON.parse(stored).id); } catch {}
    }
  }, [routerLocation.state]);

  const clearPrescription = () => {
    sessionStorage.removeItem('active_prescription');
    setActivePrescription(null);
  };

  useEffect(() => {
    fetchPharmacies();
  }, [selectedCity]);

  const fetchPharmacies = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("stores")
        .select("*")
        .eq("type", "pharmacy")
        .eq("is_active", true);

      const { data, error } = await query;

      if (error) throw error;
      setPharmacies(data || []);
    } catch (error) {
      console.error("Erro ao carregar farmácias:", error);
    } finally {
      setLoading(false);
    }
  };

  const bySearch = pharmacies.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const inCity = bySearch.filter((p) => !selectedCity || p.city === selectedCity);
  const others = bySearch.filter((p) => selectedCity && p.city !== selectedCity);
  const filteredPharmacies = showAllCities || inCity.length === 0 ? bySearch : inCity;

  const sortedPharmacies = [...filteredPharmacies].sort((a, b) => {
    switch (activeFilter) {
      case "Melhor Avaliado":
        return (b.rating || 0) - (a.rating || 0);
      default:
        return 0;
    }
  });

  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Farmácia</h1>
        <p className="text-muted-foreground text-sm">
          Medicamentos e produtos de saúde {selectedCity ? `em ${selectedCity}` : ""}
        </p>
      </div>

      {activePrescription && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 flex items-center gap-3 animate-fade-in">
          <div className="p-2 bg-primary/20 rounded-lg">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold flex items-center gap-1">
              <Zap className="h-3 w-3 text-pharmacy" /> Encomenda com receita
            </p>
            <p className="text-xs text-muted-foreground">Será marcada como prioritária no checkout</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearPrescription}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

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
          placeholder="Pesquisar farmácias..."
          className="pl-10 h-11 rounded-xl"
        />
      </div>

      {/* Filters */}
      <div className="flex overflow-x-auto gap-2 no-scrollbar -mx-4 px-4">
        {filters.map((filter) => (
          <Badge
            key={filter}
            variant={activeFilter === filter ? "default" : "outline"}
            className="cursor-pointer whitespace-nowrap px-4 py-2 rounded-full transition-all"
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </Badge>
        ))}
      </div>

      {selectedCity && inCity.length === 0 && others.length > 0 && (
        <div className="bg-muted/40 border border-border rounded-xl p-3 text-xs">
          Ainda não há farmácias em <b>{selectedCity}</b>. A mostrar {others.length} de outras cidades.
        </div>
      )}
      {selectedCity && inCity.length > 0 && others.length > 0 && (
        <button
          onClick={() => setShowAllCities((v) => !v)}
          className="text-xs text-primary font-medium self-start"
        >
          {showAllCities ? `Mostrar só ${selectedCity}` : `Ver ${others.length} de outras cidades`}
        </button>
      )}

      {/* Pharmacy List */}
      <div className="flex flex-col gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl overflow-hidden border border-border p-3 flex gap-3">
              <Skeleton className="w-20 h-20 rounded-lg" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))
        ) : sortedPharmacies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Pill className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma farmácia encontrada</p>
            <p className="text-sm">Tente ajustar sua pesquisa</p>
          </div>
        ) : (
          sortedPharmacies.map((pharmacy) => (
            <div
              key={pharmacy.id}
              onClick={() => navigate(`/store/${pharmacy.id}`)}
              className="bg-card rounded-xl border border-border p-3 flex gap-3 transition-all hover:shadow-medium cursor-pointer"
            >
              <div className="w-20 h-20 rounded-lg flex-shrink-0 overflow-hidden">
                {pharmacy.image_url ? (
                  <img
                    src={pharmacy.image_url}
                    alt={pharmacy.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-pharmacy/20 to-pharmacy/5 flex items-center justify-center">
                    <Pill className="h-8 w-8 text-pharmacy/50" />
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-medium text-sm">{pharmacy.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {pharmacy.description || "Farmácia"}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-pharmacy text-pharmacy" />
                    <span className="font-medium">{pharmacy.rating || "Novo"}</span>
                  </div>
                  {pharmacy.delivery_time && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{pharmacy.delivery_time}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Entrega: {pharmacy.delivery_fee || 0} MZN
                  </span>
                  <Button size="sm" className="h-7 text-xs rounded-full bg-pharmacy hover:bg-pharmacy/90">
                    Ver Produtos
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
