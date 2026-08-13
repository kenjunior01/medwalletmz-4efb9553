import { User, MapPin, Phone, ChevronRight } from '@/components/icons/lucide-compat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormData, Role } from './types';

interface StepIdentityProps {
  formData: FormData;
  handleInputChange: (field: string, value: any) => void;
  selectedRole: Role;
  country: any;
  nextStep: () => void;
}

export function StepIdentity({ formData, handleInputChange, selectedRole, country, nextStep }: StepIdentityProps) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-500">
      <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
          <User className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-black">Informações Pessoais</h2>
          <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">Passo obrigatório para {selectedRole}</p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-2">Nome Completo *</Label>
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Seu nome para a plataforma"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              className="pl-12 h-14 rounded-2xl border-2 border-slate-100 focus:border-primary/30 transition-all bg-white shadow-sm font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-2">Telefone *</Label>
            <div className="relative group">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder={country?.config?.phone_placeholder || "+258 ..."}
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="pl-12 h-14 rounded-2xl border-2 border-slate-100 focus:border-primary/30 transition-all bg-white shadow-sm font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-2">Cidade *</Label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
              <Select value={formData.city} onValueChange={(v) => handleInputChange('city', v)}>
                <SelectTrigger className="pl-12 h-14 rounded-2xl border-2 border-slate-100 focus:border-primary/30 transition-all bg-white shadow-sm font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {(country?.config?.cities || ["Maputo", "Beira", "Nampula"]).map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ml-2">Endereço Físico</Label>
          <div className="relative group">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Bairro, Rua, Nº"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="pl-12 h-14 rounded-2xl border-2 border-slate-100 bg-white"
            />
          </div>
        </div>
      </div>

      <Button className="w-full h-16 rounded-[2rem] font-black text-lg shadow-premium mt-8" onClick={nextStep}>
        Próximo Passo <ChevronRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
}
