import {
  Stethoscope, Building2, Store, FlaskConical, Truck,
} from '@/components/icons/lucide-compat';
import type { InstitutionRole } from './types';

/** Professional institution roles with their metadata (labels via i18n keys). */
export const INSTITUTION_ROLES: readonly InstitutionRole[] = [
  {
    role: "doctor" as const,
    icon: Stethoscope,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    gradient: "from-blue-500/5 to-blue-500/10",
    dashboard: "/doctor/dashboard",
    register: "/doctor/register",
    labelKey: "profile.role_doctor",
    descKey: "profile.role_doctor_desc",
  },
  {
    role: "clinic" as const,
    icon: Building2,
    color: "text-gold",
    bgColor: "bg-gold/10",
    borderColor: "border-gold/20",
    gradient: "from-gold/5 to-gold/10",
    dashboard: "/clinic/dashboard",
    register: "/clinic/register",
    labelKey: "profile.role_clinic",
    descKey: "profile.role_clinic_desc",
  },
  {
    role: "store_owner" as const,
    icon: Store,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    gradient: "from-green-500/5 to-green-500/10",
    dashboard: "/store/dashboard",
    register: "/store/register",
    labelKey: "profile.role_store_owner",
    descKey: "profile.role_store_owner_desc",
  },
  {
    role: "lab" as const,
    icon: FlaskConical,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
    gradient: "from-cyan-500/5 to-cyan-500/10",
    dashboard: "/lab/dashboard",
    register: "/lab/register",
    labelKey: "profile.role_lab",
    descKey: "profile.role_lab_desc",
  },
  {
    role: "driver" as const,
    icon: Truck,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    gradient: "from-orange-500/5 to-orange-500/10",
    dashboard: "/driver/dashboard",
    register: "/driver/register",
    labelKey: "profile.role_driver",
    descKey: "profile.role_driver_desc",
  },
] as const;

// Motion variants
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
};
