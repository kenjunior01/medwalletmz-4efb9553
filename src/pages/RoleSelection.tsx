import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Store, Truck, User, Stethoscope, Building2 } from 'lucide-react';

const roleOptions = [
  {
    id: 'customer',
    title: 'Cliente',
    description: 'Compre produtos e receba em casa',
    icon: User,
    path: '/auth',
    color: 'bg-blue-500'
  },
  {
    id: 'store_owner',
    title: 'Dono de Loja',
    description: 'Cadastre sua loja e venda online',
    icon: Store,
    path: '/store/register',
    color: 'bg-green-500'
  },
  {
    id: 'driver',
    title: 'Entregador',
    description: 'Faça entregas e ganhe dinheiro',
    icon: Truck,
    path: '/driver/register',
    color: 'bg-orange-500'
  },
  {
    id: 'doctor',
    title: 'Médico',
    description: 'Atenda pacientes online por chat seguro',
    icon: Stethoscope,
    path: '/doctor/register',
    color: 'bg-pharmacy'
  },
  {
    id: 'clinic',
    title: 'Clínica',
    description: 'Gerir equipa de médicos e agenda da clínica',
    icon: Building2,
    path: '/clinic/register',
    color: 'bg-gold'
  }
];

export default function RoleSelection() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleContinue = () => {
    if (selectedRole) {
      const role = roleOptions.find(r => r.id === selectedRole);
      if (role) {
        navigate(role.path);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex flex-col">
      {/* Header */}
      <div className="p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/')}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Logo */}
        <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mb-6">
          <span className="text-3xl font-bold text-primary-foreground">M</span>
        </div>
        
        <h1 className="text-2xl font-bold mb-2 text-center">Como deseja usar o MoçambiApp?</h1>
        <p className="text-muted-foreground mb-8 text-center">
          Escolha seu perfil para começar
        </p>

        {/* Role Cards */}
        <div className="w-full max-w-md space-y-4">
          {roleOptions.map(role => (
            <Card 
              key={role.id}
              className={`cursor-pointer transition-all ${
                selectedRole === role.id 
                  ? 'ring-2 ring-primary border-primary' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => setSelectedRole(role.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl ${role.color} flex items-center justify-center`}>
                    <role.icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{role.title}</h3>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 ${
                    selectedRole === role.id 
                      ? 'border-primary bg-primary' 
                      : 'border-muted-foreground'
                  }`}>
                    {selectedRole === role.id && (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button 
          className="w-full max-w-md mt-6" 
          size="lg"
          disabled={!selectedRole}
          onClick={handleContinue}
        >
          Continuar
        </Button>

        <p className="text-sm text-muted-foreground mt-4 text-center">
          Já tem uma conta?{' '}
          <button 
            className="text-primary font-medium"
            onClick={() => navigate('/auth')}
          >
            Entrar
          </button>
        </p>
      </div>
    </div>
  );
}
