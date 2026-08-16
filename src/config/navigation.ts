import {
  Home, Stethoscope, FileText, ClipboardList, User, Droplet, Pill, Building2, FlaskConical,
  Calendar, Users, MessageSquare, Truck, Package, BarChart3, Shield, Wallet, Settings, LayoutDashboard, Hospital, Video, Crown, TrendingUp, BookOpen, Globe, HeartHandshake,
  UserPlus, ShieldCheck, Share2, Radio, Route, Navigation,
} from "@/components/icons/lucide-compat";
import type { LucideIcon } from "@/components/icons/lucide-compat";

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
  | "lab" | "store_owner" | "driver" | "admin" | "country_manager" | "provincial_manager" | "insurance";

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
  provincial_manager: [
    { path: "/regional", icon: LayoutDashboard, label: "nav.dashboard" },
    { path: "/regional/orders", icon: Package, label: "nav.orders" },
    { path: "/regional/users", icon: Users, label: "nav.users_list" },
    { path: "/regional/analytics", icon: BarChart3, label: "nav.analytics" },
    { path: "/profile", icon: User, label: "nav.profile" },
  ],
  country_manager: [
    { path: "/manager", icon: LayoutDashboard, label: "nav.dashboard" },
    { path: "/manager/users", icon: Users, label: "nav.users" },
    { path: "/manager/stores", icon: Building2, label: "nav.pharmacy" },
    { path: "/manager/orders", icon: Package, label: "nav.orders" },
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
    { path: "/driver/mode", icon: Radio, label: "nav.rider_mode" },
    { path: "/driver/trips", icon: Route, label: "nav.deliveries" },
    { path: "/driver/earnings", icon: Wallet, label: "nav.earnings" },
    { path: "/profile", icon: User, label: "nav.profile" },
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
    { path: "/", icon: Home, label: "nav.home", group: "nav_group.main" },
    { path: "/planos", icon: Crown, label: "nav.premium_plans", group: "nav_group.main" },
    { path: "/monetizacao", icon: Wallet, label: "nav.my_medwallet", group: "nav_group.main" },
    { path: "/impacto", icon: Globe, label: "nav.public_impact", group: "nav_group.main" },
    { path: "/register/professional", icon: Stethoscope, label: "nav.join_professional", group: "nav_group.main" },
    { path: "/educacao", icon: BookOpen, label: "nav.health_education", group: "nav_group.health" },
    { path: "/rede-ape", icon: HeartHandshake, label: "nav.ape_network", group: "nav_group.health" },
    { path: "/health/doctors", icon: Stethoscope, label: "nav.doctors", group: "nav_group.health" },
    { path: "/health/triage", icon: MessageSquare, label: "nav.triage", group: "nav_group.health" },
    { path: "/health/consultations", icon: Calendar, label: "nav.consultations", group: "nav_group.health" },
    { path: "/health/prescriptions", icon: FileText, label: "nav.prescriptions", group: "nav_group.health" },
    { path: "/health/exams", icon: FlaskConical, label: "nav.exams", group: "nav_group.health" },
    { path: "/health/records", icon: FileText, label: "nav.records", group: "nav_group.health" },
    { path: "/health/insurance", icon: Shield, label: "nav.insurance", group: "nav_group.health" },
    { path: "/blood", icon: Droplet, label: "nav.blood", group: "nav_group.community" },
    { path: "/ranking", icon: Crown, label: "nav.ranking", group: "nav_group.community" },
    { path: "/pharmacy", icon: Pill, label: "nav.pharmacy", group: "nav_group.shopping" },
    { path: "/orders", icon: ClipboardList, label: "nav.orders", group: "nav_group.shopping" },
    { path: "/wallet", icon: Wallet, label: "nav.wallet", group: "nav_group.account" },
    { path: "/subscriptions", icon: Shield, label: "nav.subscriptions", group: "nav_group.account" },
    { path: "/profile", icon: User, label: "nav.profile", group: "nav_group.account" },
    { path: "/help", icon: MessageSquare, label: "nav.help", group: "nav_group.account" },
  ],
  doctor: [
    { path: "/doctor/dashboard", icon: LayoutDashboard, label: "nav.dashboard", group: "nav_group.clinic" },
    { path: "/doctor/availability", icon: Calendar, label: "nav.agenda", group: "nav_group.clinic" },
    { path: "/health/consultations", icon: MessageSquare, label: "nav.consultations", group: "nav_group.clinic" },
    { path: "/doctor/patients", icon: Users, label: "nav.patients", group: "nav_group.clinic" },
    { path: "/doctor/prescription/new", icon: FileText, label: "nav.prescriptions", group: "nav_group.clinic" },
    { path: "/wallet", icon: Wallet, label: "nav.wallet", group: "nav_group.account" },
    { path: "/subscriptions", icon: Shield, label: "nav.subscriptions", group: "nav_group.account" },
    { path: "/profile", icon: User, label: "nav.profile", group: "nav_group.account" },
  ],
  clinic: [
    { path: "/clinic/dashboard", icon: LayoutDashboard, label: "nav.dashboard", group: "nav_group.clinic" },
    { path: "/health/doctors", icon: Stethoscope, label: "nav.doctors", group: "nav_group.clinic" },
    { path: "/health/consultations", icon: MessageSquare, label: "nav.consultations", group: "nav_group.clinic" },
    { path: "/blood", icon: Droplet, label: "nav.blood", group: "nav_group.community" },
    { path: "/wallet", icon: Wallet, label: "nav.wallet", group: "nav_group.account" },
    { path: "/profile", icon: User, label: "nav.profile", group: "nav_group.account" },
  ],
  hospital: [
    { path: "/clinic/dashboard", icon: Hospital, label: "nav.dashboard", group: "nav_group.hospital" },
    { path: "/health/consultations", icon: MessageSquare, label: "nav.consultations", group: "nav_group.hospital" },
    { path: "/health/records", icon: FileText, label: "nav.records", group: "nav_group.hospital" },
    { path: "/blood", icon: Droplet, label: "nav.blood", group: "nav_group.community" },
    { path: "/wallet", icon: Wallet, label: "nav.wallet", group: "nav_group.account" },
    { path: "/profile", icon: User, label: "nav.profile", group: "nav_group.account" },
  ],
  lab: [
    { path: "/lab/dashboard", icon: LayoutDashboard, label: "nav.dashboard", group: "nav_group.laboratory" },
    { path: "/health/exams", icon: FlaskConical, label: "nav.exams", group: "nav_group.laboratory" },
    { path: "/health/exams/my", icon: ClipboardList, label: "nav.orders", group: "nav_group.laboratory" },
    { path: "/wallet", icon: Wallet, label: "nav.wallet", group: "nav_group.account" },
    { path: "/profile", icon: User, label: "nav.profile", group: "nav_group.account" },
  ],
  store_owner: [
    { path: "/store/dashboard", icon: LayoutDashboard, label: "nav.dashboard", group: "nav_group.store" },
    { path: "/store/dashboard/orders", icon: Package, label: "nav.orders", group: "nav_group.store" },
    { path: "/store/dashboard/products", icon: Pill, label: "nav.products", group: "nav_group.store" },
    { path: "/store/dashboard/reports", icon: BarChart3, label: "nav.reports", group: "nav_group.store" },
    { path: "/store/dashboard/settings", icon: Settings, label: "nav.settings", group: "nav_group.store" },
    { path: "/wallet", icon: Wallet, label: "nav.wallet", group: "nav_group.account" },
    { path: "/profile", icon: User, label: "nav.profile", group: "nav_group.account" },
  ],
  driver: [
    { path: "/driver/dashboard", icon: Truck, label: "nav.dashboard", group: "nav_group.panel" },
    { path: "/driver/mode", icon: Radio, label: "nav.rider_mode", group: "nav_group.work" },
    { path: "/driver/active-trip", icon: Navigation, label: "nav.active_delivery", group: "nav_group.work" },
    { path: "/driver/trips", icon: Route, label: "nav.delivery_history", group: "nav_group.work" },
    { path: "/driver/earnings", icon: Wallet, label: "nav.earnings", group: "nav_group.finance" },
    { path: "/driver/history", icon: ClipboardList, label: "nav.old_history", group: "nav_group.work" },
    { path: "/wallet", icon: Wallet, label: "nav.wallet", group: "nav_group.finance" },
    { path: "/profile", icon: User, label: "nav.profile", group: "nav_group.account" },
  ],
  admin: [
    { path: "/admin", icon: LayoutDashboard, label: "nav.home", group: "nav_group.admin" },
    { path: "/admin/curation", icon: Shield, label: "nav.curation", group: "nav_group.admin" },
    { path: "/admin/institutions", icon: Building2, label: "nav.direct_curation", group: "nav_group.institutions" },
    { path: "/admin/mz-importer", icon: Building2, label: "nav.mz_importer", group: "nav_group.institutions" },
    { path: "/admin/stores", icon: Building2, label: "nav.pharmacy", group: "nav_group.institutions" },
    { path: "/admin/labs", icon: FlaskConical, label: "nav.exams", group: "nav_group.institutions" },
    { path: "/admin/insurance", icon: Shield, label: "nav.insurance", group: "nav_group.institutions" },
    { path: "/admin/mpesa-confirmations", icon: Wallet, label: "nav.mpesa_confirmations", group: "nav_group.management" },
    { path: "/admin/users", icon: Users, label: "nav.users", group: "nav_group.management" },
    { path: "/admin/assign-country-manager", icon: UserPlus, label: "nav.assign_country_manager", group: "nav_group.management" },
    { path: "/admin/country-permissions", icon: ShieldCheck, label: "nav.manager_permissions", group: "nav_group.management" },
    { path: "/admin/assign-provincial-manager", icon: UserPlus, label: "nav.provincial_managers_mz", group: "nav_group.management" },
    { path: "/admin/provincial-permissions", icon: ShieldCheck, label: "nav.provincial_permissions_mz", group: "nav_group.management" },
    { path: "/admin/drivers", icon: Truck, label: "nav.drivers", group: "nav_group.management" },
    { path: "/admin/orders", icon: Package, label: "nav.orders", group: "nav_group.management" },
    { path: "/admin/transactions", icon: Wallet, label: "nav.financial", group: "nav_group.management" },
    { path: "/admin/monetization", icon: TrendingUp, label: "nav.mz_monetization", group: "nav_group.management" },
    { path: "/admin/subscriptions", icon: Shield, label: "nav.insurance", group: "nav_group.management" },
    { path: "/admin/subscription-plans", icon: Shield, label: "nav.subscription_plans", group: "nav_group.management" },
    { path: "/admin/campaign-links", icon: Share2, label: "nav.campaign_links", group: "nav_group.management" },
    { path: "/admin/settings", icon: Settings, label: "nav.settings", group: "nav_group.system" },
    { path: "/profile", icon: User, label: "nav.profile", group: "nav_group.account" },
  ],
  country_manager: [
    { path: "/manager", icon: LayoutDashboard, label: "nav.dashboard", group: "nav_group.overview" },
    { path: "/manager/users", icon: Users, label: "nav.users", group: "nav_group.overview" },
    { path: "/manager/stores", icon: Building2, label: "nav.pharmacy", group: "nav_group.institutions" },
    { path: "/manager/clinics", icon: Stethoscope, label: "nav.clinics", group: "nav_group.institutions" },
    { path: "/manager/orders", icon: Package, label: "nav.orders", group: "nav_group.operations" },
    { path: "/manager/drivers", icon: Truck, label: "nav.drivers", group: "nav_group.operations" },
    { path: "/manager/reports", icon: BarChart3, label: "nav.reports", group: "nav_group.operations" },
    { path: "/manager/metrics", icon: Globe, label: "nav.regional_metrics", group: "nav_group.analytics" },
    { path: "/profile", icon: User, label: "nav.profile", group: "nav_group.account" },
  ],
  provincial_manager: [
    { path: "/regional", icon: LayoutDashboard, label: "nav.dashboard", group: "nav_group.panel" },
    { path: "/regional/analytics", icon: BarChart3, label: "nav.analytics", group: "nav_group.panel" },
    { path: "/regional/users", icon: Users, label: "nav.users_list", group: "nav_group.people" },
    { path: "/regional/team", icon: Stethoscope, label: "nav.health_professionals", group: "nav_group.people" },
    { path: "/regional/riders", icon: Truck, label: "nav.riders", group: "nav_group.people" },
    { path: "/regional/facilities", icon: Building2, label: "nav.institutions", group: "nav_group.operations" },
    { path: "/regional/orders", icon: Package, label: "nav.orders", group: "nav_group.operations" },
    { path: "/regional/earnings", icon: Wallet, label: "nav.finance", group: "nav_group.operations" },
    { path: "/regional/content", icon: FileText, label: "nav.provincial_content", group: "nav_group.operations" },
    { path: "/admin/subscription-plans", icon: Shield, label: "nav.subscription_plans", group: "nav_group.operations" },
    { path: "/regional/settings", icon: Settings, label: "nav.settings", group: "nav_group.system" },
    { path: "/help", icon: MessageSquare, label: "nav.help", group: "nav_group.system" },
    { path: "/profile", icon: User, label: "nav.profile", group: "nav_group.account" },
  ],
  insurance: [
    { path: "/insurance/dashboard", icon: LayoutDashboard, label: "nav.dashboard", group: "nav_group.insurance" },
    { path: "/insurance/register", icon: Shield, label: "nav.insurance", group: "nav_group.insurance" },
    { path: "/wallet", icon: Wallet, label: "nav.financial", group: "nav_group.account" },
    { path: "/profile", icon: User, label: "nav.profile", group: "nav_group.account" },
  ],
};
