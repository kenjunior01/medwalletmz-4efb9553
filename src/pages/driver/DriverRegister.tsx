import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Truck, Loader2, User, Phone, Bike, Car } from 'lucide-react';

const vehicleTypes = [
  { value: 'bicycle', label: 'Bicicleta', icon: Bike },
  { value: 'motorcycle', label: 'Mota', icon: Bike },
  { value: 'car', label: 'Carro', icon: Car },
];

const cities = [
  'Maputo', 'Beira', 'Nampula', 'Quelimane', 'Tete', 
  'Chimoio', 'Nacala', 'Pemba', 'Lichinga', 'Xai-Xai'
];

export default function DriverRegister() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    city: '',
    vehicleType: '',
    licensePlate: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    if (!formData.fullName || !formData.phone) {
      toast.error('Preencha todos os campos obrigatórios');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.city || !formData.vehicleType) {
      toast.error('Preencha todos os campos obrigatórios');
      return false;
    }
    if (formData.vehicleType !== 'bicycle' && !formData.licensePlate) {
      toast.error('Placa do veículo é obrigatória');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Faça login para continuar');
      navigate('/auth');
      return;
    }

    setLoading(true);
    try {
      // Update profile with driver info
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          default_city: formData.city,
          vehicle_type: formData.vehicleType,
          license_plate: formData.licensePlate || null,
          is_available: true
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Add driver role
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: user.id,
          role: 'driver'
        }, { onConflict: 'user_id,role' });

      if (roleError && !roleError.message.includes('duplicate')) {
        console.error('Role error:', roleError);
      }

      toast.success('Cadastro realizado com sucesso!');
      navigate('/driver/dashboard');
    } catch (error: any) {
      console.error('Error registering driver:', error);
      toast.error('Erro ao realizar cadastro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">Seja um Entregador</h1>
            <p className="text-sm text-muted-foreground">Passo {step} de 2</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="flex gap-2 mt-4">
          {[1, 2].map(i => (
            <div 
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="p-4 pb-24">
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Dados Pessoais</h2>
              <p className="text-muted-foreground">Conte-nos sobre você</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo *</Label>
                <Input
                  id="fullName"
                  placeholder="Seu nome completo"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+258 84 XXX XXXX"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold">Benefícios de ser entregador</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Horário flexível - trabalhe quando quiser
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Ganhos por entrega + gorjetas
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Pagamento semanal garantido
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Suporte 24/7
                </li>
              </ul>
            </div>

            <Button className="w-full" onClick={() => validateStep1() && setStep(2)}>
              Continuar
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Veículo e Região</h2>
              <p className="text-muted-foreground">Informações sobre seu veículo</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cidade de Atuação *</Label>
                <Select value={formData.city} onValueChange={(v) => handleInputChange('city', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Veículo *</Label>
                <div className="grid grid-cols-3 gap-3">
                  {vehicleTypes.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleInputChange('vehicleType', value)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.vehicleType === value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon className={`h-8 w-8 mx-auto mb-2 ${
                        formData.vehicleType === value ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      <p className={`text-sm font-medium ${
                        formData.vehicleType === value ? 'text-primary' : ''
                      }`}>
                        {label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {formData.vehicleType && formData.vehicleType !== 'bicycle' && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="licensePlate">Placa do Veículo *</Label>
                  <Input
                    id="licensePlate"
                    placeholder="Ex: ABC-123"
                    value={formData.licensePlate}
                    onChange={(e) => handleInputChange('licensePlate', e.target.value.toUpperCase())}
                  />
                </div>
              )}
            </div>

            {/* Summary Card */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="font-semibold">Resumo do Cadastro</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nome:</span>
                  <span className="font-medium">{formData.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telefone:</span>
                  <span className="font-medium">{formData.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cidade:</span>
                  <span className="font-medium">{formData.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Veículo:</span>
                  <span className="font-medium">
                    {vehicleTypes.find(v => v.value === formData.vehicleType)?.label}
                  </span>
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={() => validateStep2() && handleSubmit()} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                'Completar Cadastro'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
