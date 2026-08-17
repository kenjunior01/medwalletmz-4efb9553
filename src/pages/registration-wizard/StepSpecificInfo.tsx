import { Bike, Car, CheckCircle2, Database, ChevronRight } from '@/components/icons/lucide-compat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { FormData, Role } from './types';

interface StepSpecificInfoProps {
  formData: FormData;
  handleInputChange: (field: string, value: any) => void;
  selectedRole: Role;
  country: any;
  specialties: any[];
  nextStep: () => void;
}

export function StepSpecificInfo({ formData, handleInputChange, selectedRole, country, specialties, nextStep }: StepSpecificInfoProps) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-500">
      {selectedRole === 'doctor' && (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Especialidade Principal *</Label>
            <Select value={formData.specialtyId} onValueChange={v => handleInputChange('specialtyId', v)}>
              <SelectTrigger className="h-14 rounded-2xl"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {specialties.map(s => <SelectItem key={s.id} value={s.id}>{s.icon} {s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nº de Carteira Profissional / Ordem *</Label>
            <Input value={formData.licenseNumber} onChange={e => handleInputChange('licenseNumber', e.target.value)} className="h-14 rounded-2xl" placeholder="Ex: MD-2024-..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Taxa de Consulta ({country?.currency_code || 'MZN'})</Label>
              <Input type="number" value={formData.consultationFee} onChange={e => handleInputChange('consultationFee', e.target.value)} className="h-14 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label>Anos de Experiência</Label>
              <Input type="number" value={formData.yearsExperience} onChange={e => handleInputChange('yearsExperience', e.target.value)} className="h-14 rounded-2xl" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Bio Curta</Label>
            <Textarea value={formData.bio} onChange={e => handleInputChange('bio', e.target.value)} rows={3} className="rounded-2xl" placeholder="Fale um pouco sobre sua trajetória..." />
          </div>
        </div>
      )}

      {(selectedRole === 'store_owner' || selectedRole === 'clinic' || selectedRole === 'laboratory' || selectedRole === 'insurance') && (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Nome do Estabelecimento / Seguradora *</Label>
            <Input value={formData.businessName} onChange={e => handleInputChange('businessName', e.target.value)} className="h-14 rounded-2xl" placeholder={selectedRole === 'store_owner' ? 'Ex: Farmácia Polana' : selectedRole === 'insurance' ? 'Ex: Seguradora Global' : 'Ex: Clínica Vida'} />
          </div>

          {selectedRole === 'clinic' && (
            <div className="space-y-2">
              <Label>Tipo de Unidade</Label>
              <Select value={formData.businessType} onValueChange={v => handleInputChange('businessType', v)}>
                <SelectTrigger className="h-14 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinic">Clínica</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="center">Centro de Saúde</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedRole === 'store_owner' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tempo Médio Entrega</Label>
                  <Input value={formData.deliveryTime} onChange={e => handleInputChange('deliveryTime', e.target.value)} className="h-14 rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <Label>Taxa Entrega ({country?.currency_code || 'MZN'})</Label>
                  <Input value={formData.deliveryFee} onChange={e => handleInputChange('deliveryFee', e.target.value)} className="h-14 rounded-2xl" />
                </div>
              </div>
              <div className="space-y-2 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <Label className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" /> Integração de Stock
                </Label>
                <Select defaultValue="manual">
                  <SelectTrigger className="h-12 rounded-xl bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Gestão Manual (App)</SelectItem>
                    <SelectItem value="api">Ligação API / ERP</SelectItem>
                    <SelectItem value="csv">Importação Semanal CSV</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">O gestor regional entrará em contacto para configurar a sincronização automática.</p>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Descrição / Especialidades</Label>
            <Textarea value={formData.description} onChange={e => handleInputChange('description', e.target.value)} rows={3} className="rounded-2xl" />
          </div>
        </div>
      )}

      {selectedRole === 'driver' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Tipo de Veículo *</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'bicycle', label: 'Bicicleta', icon: Bike },
                { value: 'motorcycle', label: 'Mota', icon: Bike },
                { value: 'car', label: 'Carro', icon: Car },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleInputChange('vehicleType', value)}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                    formData.vehicleType === value
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-slate-100 bg-white hover:border-primary/20"
                  )}
                >
                  <Icon className={cn("h-8 w-8", formData.vehicleType === value ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-bold", formData.vehicleType === value ? "text-primary" : "text-muted-foreground")}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {formData.vehicleType && formData.vehicleType !== 'bicycle' && (
            <div className="space-y-2 animate-in fade-in duration-300">
              <Label>Placa do Veículo *</Label>
              <Input
                placeholder={`Ex: ${country?.config?.registration_defaults?.vehicle_plate || 'ABC-123-MZ'}`}
                value={formData.licensePlate}
                onChange={(e) => handleInputChange('licensePlate', e.target.value.toUpperCase())}
                className="h-14 rounded-2xl"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Marca do Veículo *</Label>
              <Input
                placeholder="Ex: Toyota, Honda, Yamaha"
                value={formData.vehicleBrand}
                onChange={(e) => handleInputChange('vehicleBrand', e.target.value)}
                className="h-14 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Modelo do Veículo *</Label>
              <Input
                placeholder="Ex: Corolla, CB600F"
                value={formData.vehicleModel}
                onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                className="h-14 rounded-2xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cor do Veículo *</Label>
              <Select value={formData.vehicleColor} onValueChange={(v) => handleInputChange('vehicleColor', v)}>
                <SelectTrigger className="h-14 rounded-2xl">
                  <SelectValue placeholder="Selecione a cor..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="Branco">Branco</SelectItem>
                  <SelectItem value="Preto">Preto</SelectItem>
                  <SelectItem value="Prata">Prata</SelectItem>
                  <SelectItem value="Vermelho">Vermelho</SelectItem>
                  <SelectItem value="Azul">Azul</SelectItem>
                  <SelectItem value="Verde">Verde</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ano do Veículo</Label>
              <Input
                type="number"
                min={2010}
                max={2025}
                placeholder="Ex: 2022"
                value={formData.vehicleYear}
                onChange={(e) => handleInputChange('vehicleYear', e.target.value)}
                className="h-14 rounded-2xl"
              />
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-emerald-900">Ganhos Garantidos</p>
              <p className="text-[10px] text-emerald-700 leading-tight">
                Como parceiro MedWallet, você recebe pagamentos semanais via {country?.config?.payment_methods?.[0]?.name || 'M-Pesa'} e suporte priorizado.
              </p>
            </div>
          </div>
        </div>
      )}

      <Button className="w-full h-16 rounded-[2rem] font-black text-lg shadow-premium mt-8" onClick={nextStep}>
        {selectedRole === 'driver' ? 'Fotos do Veiculo' : 'Continuar para Documentos'} <ChevronRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  );
}
