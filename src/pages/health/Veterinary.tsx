import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Search,
  Heart,
  MapPin,
  Star,
  PawPrint,
  ShieldCheck,
  Calendar
} from "lucide-react";

export default function Veterinary() {
  const navigate = useNavigate();

  const vets = [
    {
      id: 1,
      name: "Clínica VetMaputo",
      specialty: "Animais de Estimação",
      address: "Av. Julius Nyerere, Maputo",
      rating: 4.8,
      reviews: 124,
      image: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=300",
      verified: true
    },
    {
      id: 2,
      name: "Dr. João Silva (Veterinário)",
      specialty: "Grandes Animais & Gado",
      address: "Matola Rio",
      rating: 4.5,
      reviews: 56,
      image: "https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?auto=format&fit=crop&q=80&w=300",
      verified: true
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">Saúde Veterinária</h1>
        <PawPrint className="h-6 w-6 text-primary" />
      </header>

      <div className="p-4 bg-primary/5 border-b flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-full">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">MedWallet Pet & Agro</p>
          <p className="text-[10px] text-muted-foreground">Clínicas e médicos verificados para todos os animais.</p>
        </div>
      </div>

      <div className="p-4">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Buscar clínica, médico ou especialidade..." />
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Próximos de ti
          </h2>

          {vets.map((vet) => (
            <Card key={vet.id} className="overflow-hidden p-0">
              <div className="flex">
                <img src={vet.image} alt={vet.name} className="w-24 h-24 object-cover" />
                <div className="flex-1 p-3 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm truncate">{vet.name}</h3>
                    {vet.verified && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none h-4 px-1">Verificado</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{vet.specialty}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                    <span className="flex items-center gap-0.5 text-yellow-600 font-bold">
                      <Star className="h-3 w-3 fill-current" /> {vet.rating}
                    </span>
                    <span>({vet.reviews} avaliações)</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-[10px] flex-1">
                      <Calendar className="h-3 w-3 mr-1" /> Agendar
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1">
                      Detalhes
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
