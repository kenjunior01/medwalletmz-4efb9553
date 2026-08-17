import {
  User, Stethoscope, Store, Building2, FlaskConical, Truck,
  ShieldCheck, PawPrint,
} from '@/components/icons/lucide-compat';

export type Role = 'customer' | 'doctor' | 'store_owner' | 'clinic' | 'laboratory' | 'driver' | 'insurance' | 'veterinary';

export interface RoleOption {
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

export interface FormData {
  // Common
  fullName: string;
  phone: string;
  city: string;
  address: string;
  avatarUrl: string;

  // Doctor specific
  specialtyId: string;
  licenseNumber: string;
  bio: string;
  consultationFee: string;
  yearsExperience: string;

  // Store/Clinic/Lab specific
  businessName: string;
  businessType: string;
  description: string;
  licenseUrl: string;
  logoUrl: string;
  deliveryTime: string;
  deliveryFee: string;

  // Driver specific
  vehicleType: string;
  licensePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleYear: string;
  licenseCartaUrl: string;
  licenseViaturaUrl: string;

  // Vehicle photos
  vehiclePhotoFront: string | null;
  vehiclePhotoSide: string | null;
  vehiclePhotoBack: string | null;
  vehiclePhotoInterior: string | null;
}

export const roleOptions: RoleOption[] = [
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

export const CATEGORY_META: Record<RoleOption['category'], { label: string; subtitle: string; color: string }> = {
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
