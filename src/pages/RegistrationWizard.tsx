import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingLayout } from '@/components/layout/OnboardingLayout';
import { Button } from '@/components/ui/button';
import { Card as ShadcnCard, CardContent as ShadcnCardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  User, Stethoscope, Store, Building2, FlaskConical, Truck,
  ChevronRight, CheckCircle2, ShieldCheck, Sparkles, Heart,
  Info, Loader2, MapPin, Phone, Mail, FileText, Camera, Database,
  Bike, Car, PawPrint
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LicenseUpload } from '@/components/upload/LicenseUpload';
import { LogoUpload } from '@/components/upload/LogoUpload';

type Role = 'customer' | 'doctor' | 'store_owner' | 'clinic' | 'laboratory' | 'driver' | 'insurance' | 'veterinary';

interface RoleOption {
  id: Role;
  title: string;
  description: string;
  icon: typeof User;
  color: string;
  gradient: string;
  category: 'Pessoal' | 'Profissional' | 'Parceiro';
  badge?: string;
  badgeColor?: string;
  free?: boolean;
}

const roleOptions: RoleOption[] = [
  {
    id: 'customer',
    title: 'Paciente',
    description: 'Triagem IA, consultas, registos — tudo grátis para sempre',
    icon: User,
    color: 'bg-emerald-500',
    gradient: 'from-emerald-400 to-teal-500',
    category: 'Pessoal',
    badge: 'GRÁTIS',
    badgeColor: 'bg-emerald-500',
    free: true,
  },
  {
    id: 'doctor',
    title: 'Médico',
    description: 'Atendimento online · agenda · receitas digitais',
    icon: Stethoscope,
    color: 'bg-blue-500',
    gradient: 'from-blue-400 to-indigo-500',
    category: 'Profissional',
    badge: 'Pro',
    badgeColor: 'bg-blue-500',
  },
  {
    id: 'veterinary',
    title: 'Veterinário',
    description: 'Saúde animal & Pet care',
    icon: PawPrint,
    color: 'bg-rose-500',
    gradient: 'from-rose-400 to-pink-500',
    category: 'Profissional',
    badge: 'Pro',
    badgeColor: 'bg-rose-500',
  },
  {
    id: 'driver',
    title: 'Entregador',
    description: 'Entregas de medicamentos e exames',
    icon: Truck,
    color: 'bg-orange-500',
    gradient: 'from-orange-400 to-amber-500',
    category: 'Profissional',
    badge: 'Plus',
    badgeColor: 'bg-orange-500',
  },
  {
    id: 'store_owner',
    title: 'Farmácia',
    description: 'Venda de medicamentos com entregas',
    icon: Store,
    color: 'bg-emerald-600',
    gradient: 'from-emerald-500 to-green-600',
    category: 'Parceiro',
    badge: 'B2B',
    badgeColor: 'bg-emerald-700',
  },
  {
    id: 'clinic',
    title: 'Clínica',
    description: 'Gestão de unidade · médicos · agenda',
    icon: Building2,
    color: 'bg-amber-500',
    gradient: 'from-amber-400 to-orange-500',
    category: 'Parceiro',
    badge: 'B2B',
    badgeColor: 'bg-amber-600',
  },
  {
    id: 'laboratory',
    title: 'Laboratório',
    description: 'Exames · resultados digitais',
    icon: FlaskConical,
    color: 'bg-cyan-500',
    gradient: 'from-cyan-400 to-blue-500',
    category: 'Parceiro',
    badge: 'B2B',
    badgeColor: 'bg-cyan-600',
  },
  {
    id: 'insurance',
    title: 'Seguradora',
    description: 'Planos de saúde integrados',
    icon: ShieldCheck,
    color: 'bg-indigo-500',
    gradient: 'from-indigo-400 to-purple-500',
    category: 'Parceiro',
    badge: 'B2B',
    badgeColor: 'bg-indigo-600',
  },
];

const CATEGORY_META: Record<RoleOption['category'], { label: string; subtitle: string; color: string }> = {
  'Pessoal': {
    label: 'Para si e sua família',
    subtitle: 'Sempre grátis · sem cartão · sem limite',
    color: 'text-emerald-700',
  },
  'Profissional': {
    label: 'Para profissionais de saúde',
    subtitle: 'Planos Pro a partir de 1.500 MZN/mês',
    color: 'text-blue-700',
  },
  'Parceiro': {
    label: 'Para instituições',
    subtitle: 'SaaS B2B · gestão completa',
    color: 'text-amber-700',
  },
};

export default function RegistrationWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, roles, refreshRoles } = useAuth();
  const { country, t } = useCountry();

  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [specialties, setSpecialties] = useState<any[]>([]);

  // Verifica se o utilizador já tem o papel que está a tentar registar
  useEffect(() => {
    if (user && selectedRole && roles.includes(selectedRole as any)) {
      toast.info(`Você já está registado como ${roleOptions.find(r => r.id === selectedRole)?.title}.`);

      // Redireciona para o dashboard apropriado
      const dashboardMap: Record<string, string> = {
        doctor: '/doctor/dashboard',
        store_owner: '/store/dashboard',
        clinic: '/clinic/dashboard',
        laboratory: '/lab/dashboard',
        driver: '/driver/dashboard',
        insurance: '/insurance/dashboard',
        veterinary: '/health/veterinary'
      };

      navigate(dashboardMap[selectedRole] || '/');
    }
  }, [user, selectedRole, roles, navigate]);

  // Form States
  const [formData, setFormData] = useState({
    // Common
    fullName: user?.user_metadata?.full_name || '',
    phone: '',
    city: country?.config?.cities?.[0] || 'Maputo',
    address: '',

    // Doctor specific
    specialtyId: '',
    licenseNumber: '',
    bio: '',
    consultationFee: String(country?.config?.registration_defaults?.consultation_fee || 500),
    yearsExperience: '0',

    // Store/Clinic/Lab specific
    businessName: '',
    businessType: 'pharmacy',
    description: '',
    licenseUrl: '',
    logoUrl: '',
    deliveryTime: '30-45 min',
    deliveryFee: String(country?.config?.registration_defaults?.delivery_fee || 50),

    // Driver specific
    vehicleType: '',
    licensePlate: '',
    licenseCartaUrl: '',
    licenseViaturaUrl: '',
  });

  useEffect(() => {
    if (country) {
      setFormData(prev => ({
        ...prev,
        city: country.config?.cities?.[0] || prev.city,
        consultationFee: String(country.config?.registration_defaults?.consultation_fee || 500),
        deliveryFee: String(country.config?.registration_defaults?.delivery_fee || 50),
      }));
    }
  }, [country]);

  useEffect(() => {
    // Detect role from URL param or pathname
    const roleParam = searchParams.get('role') as Role;
    const path = window.location.pathname;

    let detectedRole: Role | null = null;
    if (roleParam && roleOptions.find(r => r.id === roleParam)) {
      detectedRole = roleParam;
    } else if (path.includes('/doctor/')) {
      detectedRole = 'doctor';
    } else if (path.includes('/store/') || path.includes('/pharmacy/')) {
      detectedRole = 'store_owner';
    } else if (path.includes('/clinic/') || path.includes('/hospital/')) {
      detectedRole = 'clinic';
    } else if (path.includes('/lab/')) {
      detectedRole = 'laboratory';
    } else if (path.includes('/insurance/')) {
      detectedRole = 'insurance';
    } else if (path.includes('/driver/')) {
      detectedRole = 'driver';
    }

    if (detectedRole) {
      setSelectedRole(detectedRole);
      setStep(2);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedRole === 'doctor') {
      supabase.from('medical_specialties').select('*').order('name').then(({ data }) => setSpecialties(data || []));
    }
  }, [selectedRole]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = async () => {
    if (step === 1 && !selectedRole) return toast.error('Selecione um perfil');
    if (step === 2 && selectedRole !== 'customer' && !formData.fullName) return toast.error('Nome é obrigatório');

    if (selectedRole === 'customer' && step === 1) {
      if (user) {
        try {
          await supabase.from('profiles').upsert({
            user_id: user.id,
            onboarding_completed: true,
            country_id: country?.id || 'MZ',
            full_name: formData.fullName || user.user_metadata?.full_name || user.email?.split('@')[0],
          });
        } catch (e) { /* non-blocking */ }
      }
      navigate('/');
      return;
    }

    setStep(prev => prev + 1);
  };

  const submitRegistration = async () => {
    if (!user) {
      toast.info('Crie a sua conta primeiro para continuarmos o seu registo profissional.');
      const params = new URLSearchParams({
        tab: 'register',
        mode: 'professional',
        next: `/register?role=${selectedRole ?? ''}`,
      });
      return navigate(`/auth?${params.toString()}`);
    }
    setLoading(true);
    try {
      // 1. Update Profile (common)
      await supabase.from('profiles').upsert({
        user_id: user.id,
        full_name: formData.fullName || user.user_metadata?.full_name || user.email?.split('@')[0],
        phone: formData.phone,
        country_id: country?.id || 'MZ',
        default_city: formData.city,
        onboarding_completed: true,
      });

      // 2. Role specific logic
      if (selectedRole === 'doctor' || selectedRole === 'veterinary') {
        if (!formData.licenseNumber?.trim()) {
          toast.error('Número de licença profissional é obrigatório');
          setLoading(false);
          return;
        }
        const { error: dErr } = await supabase.from('doctor_profiles').upsert({
          user_id: user.id,
          license_number: formData.licenseNumber.trim(),
          specialty_id: formData.specialtyId || null,
          bio: formData.bio || null,
          consultation_fee: parseInt(formData.consultationFee) || 500,
          years_experience: parseInt(formData.yearsExperience) || 0,
          is_available: true,
          license_url: formData.licenseUrl || null,
        }, { onConflict: 'user_id' });
        if (dErr) throw dErr;
        await supabase.from('user_roles').upsert({ user_id: user.id, role: selectedRole, country_id: country?.id || 'MZ' });
        await refreshRoles();
        navigate(selectedRole === 'doctor' ? '/doctor/dashboard' : '/health/veterinary');
      }
      else if (selectedRole === 'store_owner') {
        const { data: store, error: sErr } = await supabase.from('stores').insert({
          name: formData.businessName,
          type: formData.businessType,
          description: formData.description,
          address: formData.address,
          city: formData.city,
          country_id: country?.id || 'MZ',
          delivery_time: formData.deliveryTime,
          delivery_fee: parseFloat(formData.deliveryFee),
          image_url: formData.logoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
          owner_id: user.id,
          is_active: true
        }).select().single();
        if (sErr) throw sErr;
        await supabase.from('user_roles').upsert({ user_id: user.id, role: 'store_owner', country_id: country?.id || 'MZ' });
        await refreshRoles();
        navigate('/store/dashboard');
      }
      else if (selectedRole === 'clinic' || selectedRole === 'laboratory') {
        const { error: cErr } = await supabase.from('clinics').insert({
          name: formData.businessName,
          type: selectedRole === 'laboratory' ? 'laboratory' : (formData.businessType as any),
          description: formData.description,
          address: formData.address,
          city: formData.city,
          country_id: country?.id || 'MZ',
          phone: formData.phone,
          email: user.email,
          license_url: formData.licenseUrl,
          logo_url: formData.logoUrl,
          owner_id: user.id,
          is_active: false // Needs verification
        });
        if (cErr) throw cErr;
        await supabase.from('user_roles').upsert({ user_id: user.id, role: 'clinic', country_id: country?.id || 'MZ' });
        await refreshRoles();
        navigate(selectedRole === 'laboratory' ? '/lab/dashboard' : '/clinic/dashboard');
      }

      else if (selectedRole === 'insurance') {
        const { error: iErr } = await supabase.from('insurance_companies').insert({
          name: formData.businessName,
          description: formData.description,
          phone: formData.phone,
          email: user.email,
          city: formData.city,
          address: formData.address,
          owner_id: user.id,
          is_active: false
        });
        if (iErr) throw iErr;
        await supabase.from('user_roles').upsert({ user_id: user.id, role: 'insurance', country_id: country?.id || 'MZ' });
        await refreshRoles();
        navigate('/insurance/dashboard');
      }
      else if (selectedRole === 'driver') {
        const { error: pErr } = await supabase.from('profiles').upsert({
          user_id: user.id,
          vehicle_type: formData.vehicleType,
          license_plate: formData.licensePlate || null,
          is_available: true,
          license_carta_url: formData.licenseCartaUrl || null,
          license_viatura_url: formData.licenseViaturaUrl || null,
          onboarding_completed: true,
          country_id: country?.id || 'MZ',
          full_name: formData.fullName || user.user_metadata?.full_name || user.email?.split('@')[0],
        });
        if (pErr) throw pErr;
        await supabase.from('user_roles').upsert({ user_id: user.id, role: 'driver', country_id: country?.id || 'MZ' });
        await refreshRoles();
        navigate('/driver/dashboard');
      }

      toast.success('Registo concluído com sucesso!');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Erro ao processar registo');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-5">
            {/* Hero compacto */}
            <div className="text-center mb-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/30 relative"
              >
                <Sparkles className="h-8 w-8 text-white" />
                <div className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 border-2 border-white">
                  MZ
                </div>
              </motion.div>
              <h2 className="text-2xl font-black tracking-tight mb-1">
                Como deseja usar o MedWallet?
              </h2>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Pacientes usam grátis para sempre. Profissionais e instituições têm planos pagos.
              </p>
            </div>

            {/* Paciente — destaque gratuito (card grande no topo) */}
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              onClick={() => setSelectedRole('customer')}
              className={cn(
                "w-full text-left rounded-3xl p-4 border-2 transition-all duration-300 relative overflow-hidden",
                selectedRole === 'customer'
                  ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/20 scale-[1.01]"
                  : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 hover:border-emerald-400"
              )}
            >
              {selectedRole === 'customer' && (
                <div className="absolute top-3 right-3 bg-emerald-500 text-white p-1 rounded-full">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shrink-0">
                  <User className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base">Paciente</h3>
                    <span className="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider rounded-full px-2 py-0.5">
                      Grátis para sempre
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Triagem IA ilimitada · consultas · registos · lembretes WhatsApp
                  </p>
                </div>
              </div>
            </motion.button>

            {/* Profissionais — header + grid 2 cols */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between px-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-700">
                  Profissionais
                </h3>
                <span className="text-[10px] text-muted-foreground">Planos Pro pagos</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {roleOptions.filter(r => r.category === 'Profissional').map((role, i) => (
                  <motion.button
                    key={role.id}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.04 }}
                    onClick={() => setSelectedRole(role.id)}
                    className={cn(
                      "text-left rounded-2xl p-3 border-2 transition-all duration-300 relative",
                      selectedRole === role.id
                        ? "border-blue-500 bg-blue-50 shadow-md scale-[1.02]"
                        : "border-transparent bg-white hover:border-blue-300 hover:shadow-sm"
                    )}
                  >
                    {selectedRole === role.id && (
                      <div className="absolute top-2 right-2 bg-blue-500 text-white p-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" />
                      </div>
                    )}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center mb-2 shadow-sm",
                      `bg-gradient-to-br ${role.gradient}`
                    )}>
                      <role.icon className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="font-bold text-sm">{role.title}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                      {role.description}
                    </p>
                    {role.badge && (
                      <span className={cn(
                        "inline-block mt-1.5 text-[8px] font-black uppercase tracking-wider rounded-full px-1.5 py-0.5 text-white",
                        role.badgeColor
                      )}>
                        {role.badge}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Instituições / Parceiros — header + grid 2 cols */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between px-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-amber-700">
                  Instituições
                </h3>
                <span className="text-[10px] text-muted-foreground">SaaS B2B</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {roleOptions.filter(r => r.category === 'Parceiro').map((role, i) => (
                  <motion.button
                    key={role.id}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.04 }}
                    onClick={() => setSelectedRole(role.id)}
                    className={cn(
                      "text-left rounded-2xl p-3 border-2 transition-all duration-300 relative",
                      selectedRole === role.id
                        ? "border-amber-500 bg-amber-50 shadow-md scale-[1.02]"
                        : "border-transparent bg-white hover:border-amber-300 hover:shadow-sm"
                    )}
                  >
                    {selectedRole === role.id && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-white p-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" />
                      </div>
                    )}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center mb-2 shadow-sm",
                      `bg-gradient-to-br ${role.gradient}`
                    )}>
                      <role.icon className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="font-bold text-sm">{role.title}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                      {role.description}
                    </p>
                    {role.badge && (
                      <span className={cn(
                        "inline-block mt-1.5 text-[8px] font-black uppercase tracking-wider rounded-full px-1.5 py-0.5 text-white",
                        role.badgeColor
                      )}>
                        {role.badge}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Trust badge */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground pt-1">
              <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
              <span>Mais de 2.500 profissionais já usam o MedWallet MZ</span>
            </div>

            <Button
              className="w-full h-14 rounded-2xl font-black text-base mt-2"
              disabled={!selectedRole}
              onClick={nextStep}
            >
              Continuar <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        );

      case 2: // Identity
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

      case 3: // Specific Info
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
              {selectedRole === 'driver' ? 'Documentos do Condutor' : 'Continuar para Documentos'} <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        );

      case 4: // Verification
        return (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <ShadcnCard className="p-6 border-2 border-primary/20 bg-primary/5 rounded-[2rem]">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Verificação de Segurança</h3>
                  <p className="text-xs text-muted-foreground">Para garantir a segurança dos pacientes, precisamos validar a sua licença profissional ou do estabelecimento.</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-[8px] bg-primary/5 text-primary border-primary/20 font-black">
                      <Sparkles className="h-2 w-2 mr-1" /> GOOGLE DOCUMENT AI READY
                    </Badge>
                  </div>
                </div>
              </div>
            </ShadcnCard>

            <div className="space-y-6">
              {selectedRole === 'driver' ? (
                <>
                  <LicenseUpload
                    slot="carta"
                    label="Carta de Condução *"
                    description="Upload da frente (Foto/PDF)"
                    value={formData.licenseCartaUrl}
                    onUploaded={(p) => handleInputChange('licenseCartaUrl', p)}
                  />
                  {formData.vehicleType !== 'bicycle' && (
                    <LicenseUpload
                      slot="viatura"
                      label="Livrete / Registo do Veículo *"
                      description="Documento oficial da viatura"
                      value={formData.licenseViaturaUrl}
                      onUploaded={(p) => handleInputChange('licenseViaturaUrl', p)}
                    />
                  )}
                </>
              ) : (
                <LicenseUpload
                  slot="registration-license"
                  label={selectedRole === 'doctor' ? "Cédula Profissional / Alvará *" : "Licença Sanitária / MISAU *"}
                  description="Carregue uma foto ou PDF nítido"
                  value={formData.licenseUrl}
                  onUploaded={(p) => handleInputChange('licenseUrl', p)}
                />
              )}

              {(selectedRole === 'clinic' || selectedRole === 'store_owner' || selectedRole === 'laboratory') && (
                <LogoUpload
                  label="Logotipo do Estabelecimento"
                  description="Aparecerá no perfil público"
                  value={formData.logoUrl}
                  onUploaded={(p) => handleInputChange('logoUrl', p)}
                  bucket="licenses"
                  folder="business-logos"
                />
              )}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 mt-4">
              <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[10px] text-amber-800 font-black leading-tight uppercase tracking-wider">
                  O seu perfil passará por uma curadoria manual pelo Gestor Regional de {country?.name || 'MedWallet'}.
                </p>
                <p className="text-[9px] text-amber-700/70 font-bold uppercase tracking-tighter">
                  Tempo estimado: 2 a 24 horas úteis.
                </p>
              </div>
            </div>

            <Button
              className="w-full h-16 rounded-[2rem] font-black text-lg shadow-premium mt-8 bg-primary"
              onClick={submitRegistration}
              disabled={loading || (selectedRole === 'driver' ? !formData.licenseCartaUrl : !formData.licenseUrl)}
            >
              {loading ? <Loader2 className="animate-spin h-6 w-6" /> : (
                <span className="flex items-center gap-2">
                  Finalizar Registo <CheckCircle2 className="h-5 w-5" />
                </span>
              )}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <OnboardingLayout
      title={selectedRole ? `Registo de ${roleOptions.find(r => r.id === selectedRole)?.title}` : "Bem-vindo ao MedWallet"}
      subtitle={selectedRole ? "Complete o seu perfil profissional" : "Escolha como deseja usar a plataforma"}
      step={step}
      totalSteps={selectedRole === 'customer' ? 1 : 4}
      onBack={() => step > 1 ? setStep(step - 1) : navigate(-1)}
      countryName={country?.name}
    >
      {renderStep()}
    </OnboardingLayout>
  );
}
