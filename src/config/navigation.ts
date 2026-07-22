import {
  Home, Stethoscope, FileText, ClipboardList, User, Droplet, Pill, Building2, FlaskConical,
  Calendar, Users, MessageSquare, Truck, Package, BarChart3, Shield, Wallet, Settings, LayoutDashboard, Hospital, Video, Crown, TrendingUp, BookOpen, Globe, HeartHandshake,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  path: string;
  icon: LucideIcon;
  label: string;
  group?: string;
  /** Renderizado como botão central grande (destaque) na BottomNav. */
  highlight?: boolean;
};

export type RoleKey =
  | "customer" | "doctor" | "clinic" | "hospital"
  | "lab" | "store_owner" | "driver" | "admin" | "country_manager" | "insurance";

/** Primary 5 items for mobile BottomNav per role. */
export const bottomNavByRole: Record<RoleKey, NavItem[]> = {
  // ... existing roles
  insurance: [
    { path: "/insurance/dashboard", icon: LayoutDashboard, label: "nav.dashboard" },
    { path: "/insurance/register", icon: Shield, label: "nav.insurance" },
    { path: "/help", icon: MessageSquare, label: "nav.help" },
    { path: "/profile", icon: User, label: "nav.profile" },
    { path: "/", icon: Home, label: "nav.home" },
  ],
  country_manager: [
    { path: "/admin/country-dashboard", icon: LayoutDashboard, label: "nav.dashboard" },
    { path: "/admin/curation", icon: Shield, label: "nav.approvals" },
    { path: "/admin/transactions", icon: Wallet, label: "nav.financial" },
    { path: "/help", icon: MessageSquare, label: "nav.support" },
    { path: "/profile", icon: User, label: "nav.profile" },
  ],
  customer: [
    { path: "/", icon: Home, label: "nav.home" },
    { path: "/health/facilities", icon: Hospital, label: "nav.hospitals" },
    { path: "/health/triage", icon: Video, label: "nav.triage", highlight: true },
    { path: "/pharmacy", icon: Pill, label: "nav.pharmacy" },
    { path: "/profile", icon: User, label: "nav.profile" },
  ],
  doctor: [
    { path: "/doctor/dashboard", icon: LayoutDashboard, label: "nav.dashboard" },
    { path: "/doctor/availability", icon: Calendar, label: "nav.agenda" },
    { path: "/health/consultations", icon: MessageSquare, label: "nav.consultations" },
    { path: "/doctor/patients", icon: Users, label: "nav.patients" },
    { path: "/profile", icon: User, label: "nav.profile" },
  ],
  clinic: [
    { path: "/clinic/dashboard", icon: LayoutDashboard, label: "nav.dashboard" },
    { path: "/health/doctors", icon: Stethoscope, label: "nav.doctors" },
    { path: "/health/consultations", icon: MessageSquare, label: "nav.consultations" },
    { path: "/blood", icon: Droplet, label: "nav.blood" },
    { path: "/profile", icon: User, label: "nav.profile" },
  ],
  hospital: [
    { path: "/clinic/dashboard", icon: Hospital, label: "nav.dashboard" },
    { path: "/health/consultations", icon: MessageSquare, label: "nav.consultations" },
    { path: "/blood", icon: Droplet, label: "nav.blood" },
    { path: "/health/records", icon: FileText, label: "nav.records" },
    { path: "/profile", icon: User, label: "nav.profile" },
  ],
  lab: [
    { path: "/lab/dashboard", icon: LayoutDashboard, label: "nav.dashboard" },
    { path: "/health/exams", icon: FlaskConical, label: "nav.exams" },
    { path: "/health/exams/my", icon: ClipboardList, label: "nav.orders" },
    { path: "/wallet", icon: Wallet, label: "nav.wallet" },
    { path: "/profile", icon: User, label: "nav.profile" },
  ],
  store_owner: [
    { path: "/store/dashboard", icon: LayoutDashboard, label: "nav.dashboard" },
    { path: "/store/dashboard/orders", icon: Package, label: "nav.orders" },
    { path: "/store/dashboard/products", icon: Pill, label: "nav.products" },
    { path: "/store/dashboard/reports", icon: BarChart3, label: "nav.reports" },
    { path: "/profile", icon: User, label: "nav.profile" },
  ],
  driver: [
    { path: "/driver/dashboard", icon: Truck, label: "nav.dashboard" },
    { path: "/driver/history", icon: ClipboardList, label: "nav.history" },
    { path: "/wallet", icon: Wallet, label: "nav.earnings" },
    { path: "/profile", icon: User, label: "nav.profile" },
    { path: "/help", icon: MessageSquare, label: "nav.help" },
  ],
  admin: [
    { path: "/admin", icon: LayoutDashboard, label: "nav.admin" },
    { path: "/admin/curation", icon: Shield, label: "nav.curation" },
    { path: "/admin/users", icon: Users, label: "nav.users" },
    { path: "/admin/transactions", icon: Wallet, label: "nav.financial" },
    { path: "/profile", icon: User, label: "nav.profile" },
  ],
};

/** Full sidebar (desktop/tablet) grouped items per role. */
export const sidebarByRole: Record<RoleKey, NavItem[]> = {
  customer: [
    { path: "/", icon: Home, label: "nav.home", group: "Principal" },
    { path: "/planos", icon: Crown, label: "Planos Premium", group: "Principal" },
    { path: "/monetizacao", icon: Wallet, label: "O meu MedWallet", group: "Principal" },
    { path: "/impacto", icon: Globe, label: "Impacto Público", group: "Principal" },
    { path: "/doctor/register", icon: Stethoscope, label: "Sou Profissional de Saúde", group: "Principal" },
    { path: "/educacao", icon: BookOpen, label: "Educação em Saúde", group: "Saúde" },
    { path: "/rede-ape", icon: HeartHandshake, label: "Rede APE", group: "Saúde" },
    { path: "/health/doctors", icon: Stethoscope, label: "nav.doctors", group: "Saúde" },
    { path: "/health/triage", icon: MessageSquare, label: "nav.triage", group: "Saúde" },
    { path: "/health/consultations", icon: Calendar, label: "nav.consultations", group: "Saúde" },
    { path: "/health/prescriptions", icon: FileText, label: "nav.prescriptions", group: "Saúde" },
    { path: "/health/exams", icon: FlaskConical, label: "nav.exams", group: "Saúde" },
    { path: "/health/records", icon: FileText, label: "nav.records", group: "Saúde" },
    { path: "/health/insurance", icon: Shield, label: "nav.insurance", group: "Saúde" },
    { path: "/blood", icon: Droplet, label: "nav.blood", group: "Comunidade" },
    { path: "/ranking", icon: Crown, label: "Ranking", group: "Comunidade" },
    { path: "/pharmacy", icon: Pill, label: "nav.pharmacy", group: "Compras" },
    { path: "/orders", icon: ClipboardList, label: "nav.orders", group: "Compras" },
    { path: "/wallet", icon: Wallet, label: "nav.wallet", group: "Conta" },
    { path: "/subscriptions", icon: Shield, label: "nav.insurance", group: "Conta" },
    { path: "/profile", icon: User, label: "nav.profile", group: "Conta" },
    { path: "/help", icon: MessageSquare, label: "nav.help", group: "Conta" },
  ],
  doctor: [
    { path: "/doctor/dashboard", icon: LayoutDashboard, label: "nav.dashboard", group: "Consultório" },
    { path: "/doctor/availability", icon: Calendar, label: "nav.agenda", group: "Consultório" },
    { path: "/health/consultations", icon: MessageSquare, label: "nav.consultations", group: "Consultório" },
    { path: "/doctor/patients", icon: Users, label: "nav.patients", group: "Consultório" },
    { path: "/doctor/prescription/new", icon: FileText, label: "nav.prescriptions", group: "Consultório" },
    { path: "/wallet", icon: Wallet, label: "nav.wallet", group: "Conta" },
    { path: "/subscriptions", icon: Shield, label: "nav.insurance", group: "Conta" },
    { path: "/profile", icon: User, label: "nav.profile", group: "Conta" },
  ],
  clinic: [
    { path: "/clinic/dashboard", icon: LayoutDashboard, label: "nav.dashboard", group: "Clínica" },
    { path: "/health/doctors", icon: Stethoscope, label: "nav.doctors", group: "Clínica" },
    { path: "/health/consultations", icon: MessageSquare, label: "nav.consultations", group: "Clínica" },
    { path: "/blood", icon: Droplet, label: "nav.blood", group: "Comunidade" },
    { path: "/wallet", icon: Wallet, label: "nav.wallet", group: "Conta" },
    { path: "/profile", icon: User, label: "nav.profile", group: "Conta" },
  ],
  hospital: [
    { path: "/clinic/dashboard", icon: Hospital, label: "nav.dashboard", group: "Hospital" },
    { path: "/health/consultations", icon: MessageSquare, label: "nav.consultations", group: "Hospital" },
    { path: "/health/records", icon: FileText, label: "nav.records", group: "Hospital" },
    { path: "/blood", icon: Droplet, label: "nav.blood", group: "Comunidade" },
    { path: "/wallet", icon: Wallet, label: "nav.wallet", group: "Conta" },
    { path: "/profile", icon: User, label: "nav.profile", group: "Conta" },
  ],
  lab: [
    { path: "/lab/dashboard", icon: LayoutDashboard, label: "nav.dashboard", group: "Laboratório" },
    { path: "/health/exams", icon: FlaskConical, label: "nav.exams", group: "Laboratório" },
    { path: "/health/exams/my", icon: ClipboardList, label: "nav.orders", group: "Laboratório" },
    { path: "/wallet", icon: Wallet, label: "nav.wallet", group: "Conta" },
    { path: "/profile", icon: User, label: "nav.profile", group: "Conta" },
  ],
  store_owner: [
    { path: "/store/dashboard", icon: LayoutDashboard, label: "nav.dashboard", group: "Loja" },
    { path: "/store/dashboard/orders", icon: Package, label: "nav.orders", group: "Loja" },
    { path: "/store/dashboard/products", icon: Pill, label: "nav.products", group: "Loja" },
    { path: "/store/dashboard/reports", icon: BarChart3, label: "nav.reports", group: "Loja" },
    { path: "/store/dashboard/settings", icon: Settings, label: "nav.settings", group: "Loja" },
    { path: "/wallet", icon: Wallet, label: "nav.wallet", group: "Conta" },
    { path: "/profile", icon: User, label: "nav.profile", group: "Conta" },
  ],
  driver: [
    { path: "/driver/dashboard", icon: Truck, label: "nav.dashboard", group: "Entregas" },
    { path: "/driver/history", icon: ClipboardList, label: "nav.history", group: "Entregas" },
    { path: "/wallet", icon: Wallet, label: "nav.earnings", group: "Conta" },
    { path: "/profile", icon: User, label: "nav.profile", group: "Conta" },
  ],
  admin: [
    { path: "/admin", icon: LayoutDashboard, label: "nav.home", group: "Admin" },
    { path: "/admin/curation", icon: Shield, label: "nav.curation", group: "Admin" },
    { path: "/admin/institutions", icon: Building2, label: "Curadoria Direta", group: "Instituições" },
    { path: "/admin/mz-importer", icon: Building2, label: "Importador MZ (Google)", group: "Instituições" },
    { path: "/admin/stores", icon: Building2, label: "nav.pharmacy", group: "Instituições" },
    { path: "/admin/labs", icon: FlaskConical, label: "nav.exams", group: "Instituições" },
    { path: "/admin/insurance", icon: Shield, label: "nav.insurance", group: "Instituições" },
    { path: "/admin/mpesa-confirmations", icon: Wallet, label: "Confirmações M-Pesa", group: "Gestão" },
    { path: "/admin/users", icon: Users, label: "nav.users", group: "Gestão" },
    { path: "/admin/drivers", icon: Truck, label: "nav.drivers", group: "Gestão" },
    { path: "/admin/orders", icon: Package, label: "nav.orders", group: "Gestão" },
    { path: "/admin/transactions", icon: Wallet, label: "nav.financial", group: "Gestão" },
    { path: "/admin/monetization", icon: TrendingUp, label: "Monetização MZ", group: "Gestão" },
    { path: "/admin/subscriptions", icon: Shield, label: "nav.insurance", group: "Gestão" },
    { path: "/admin/subscription-plans", icon: Shield, label: "nav.insurance", group: "Gestão" },
    { path: "/admin/settings", icon: Settings, label: "nav.settings", group: "Sistema" },
    { path: "/profile", icon: User, label: "nav.profile", group: "Conta" },
  ],
  country_manager: [
    { path: "/admin/country-dashboard", icon: LayoutDashboard, label: "nav.dashboard", group: "Região" },
    { path: "/admin/curation", icon: Shield, label: "nav.approvals", group: "Região" },
    { path: "/admin/mpesa-confirmations", icon: Wallet, label: "Confirmações M-Pesa", group: "Região" },
    { path: "/admin/transactions", icon: Wallet, label: "nav.financial", group: "Região" },
    { path: "/admin/country-settings", icon: Settings, label: "nav.settings", group: "Região" },
    { path: "/profile", icon: User, label: "nav.profile", group: "Conta" },
  ],
  insurance: [
    { path: "/insurance/dashboard", icon: LayoutDashboard, label: "nav.dashboard", group: "Seguros" },
    { path: "/insurance/register", icon: Shield, label: "nav.insurance", group: "Seguros" },
    { path: "/wallet", icon: Wallet, label: "nav.financial", group: "Conta" },
    { path: "/profile", icon: User, label: "nav.profile", group: "Conta" },
  ],
};
