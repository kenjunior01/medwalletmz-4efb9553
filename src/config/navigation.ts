import {
  Home, Stethoscope, FileText, ClipboardList, User, Droplet, Pill, Building2, FlaskConical,
  Calendar, Users, MessageSquare, Truck, Package, BarChart3, Shield, Wallet, Settings, LayoutDashboard, Hospital, Video,
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
  | "lab" | "store_owner" | "driver" | "admin" | "country_manager";

/** Primary 5 items for mobile BottomNav per role. */
export const bottomNavByRole: Record<RoleKey, NavItem[]> = {
  // ... existing roles
  country_manager: [
    { path: "/admin/country-dashboard", icon: LayoutDashboard, label: "Painel" },
    { path: "/admin/curation", icon: Shield, label: "Aprovações" },
    { path: "/admin/transactions", icon: Wallet, label: "Financeiro" },
    { path: "/help", icon: MessageSquare, label: "Suporte" },
    { path: "/profile", icon: User, label: "Perfil" },
  ],
  customer: [
    { path: "/", icon: Home, label: "Início" },
    { path: "/health/facilities", icon: Hospital, label: "Hospitais" },
    { path: "/health/triage", icon: Video, label: "Consulta", highlight: true },
    { path: "/pharmacy", icon: Pill, label: "Farmácia" },
    { path: "/profile", icon: User, label: "Perfil" },
  ],
  doctor: [
    { path: "/doctor/dashboard", icon: LayoutDashboard, label: "Painel" },
    { path: "/doctor/availability", icon: Calendar, label: "Agenda" },
    { path: "/health/consultations", icon: MessageSquare, label: "Consultas" },
    { path: "/doctor/patients", icon: Users, label: "Pacientes" },
    { path: "/profile", icon: User, label: "Perfil" },
  ],
  clinic: [
    { path: "/clinic/dashboard", icon: LayoutDashboard, label: "Painel" },
    { path: "/health/doctors", icon: Stethoscope, label: "Médicos" },
    { path: "/health/consultations", icon: MessageSquare, label: "Consultas" },
    { path: "/blood", icon: Droplet, label: "Sangue" },
    { path: "/profile", icon: User, label: "Perfil" },
  ],
  hospital: [
    { path: "/clinic/dashboard", icon: Hospital, label: "Painel" },
    { path: "/health/consultations", icon: MessageSquare, label: "Consultas" },
    { path: "/blood", icon: Droplet, label: "Sangue" },
    { path: "/health/records", icon: FileText, label: "Registos" },
    { path: "/profile", icon: User, label: "Perfil" },
  ],
  lab: [
    { path: "/lab/dashboard", icon: LayoutDashboard, label: "Painel" },
    { path: "/health/exams", icon: FlaskConical, label: "Exames" },
    { path: "/health/exams/my", icon: ClipboardList, label: "Pedidos" },
    { path: "/wallet", icon: Wallet, label: "Carteira" },
    { path: "/profile", icon: User, label: "Perfil" },
  ],
  store_owner: [
    { path: "/store/dashboard", icon: LayoutDashboard, label: "Painel" },
    { path: "/store/dashboard/orders", icon: Package, label: "Encomendas" },
    { path: "/store/dashboard/products", icon: Pill, label: "Produtos" },
    { path: "/store/dashboard/reports", icon: BarChart3, label: "Relatórios" },
    { path: "/profile", icon: User, label: "Perfil" },
  ],
  driver: [
    { path: "/driver/dashboard", icon: Truck, label: "Painel" },
    { path: "/driver/history", icon: ClipboardList, label: "Histórico" },
    { path: "/wallet", icon: Wallet, label: "Ganhos" },
    { path: "/profile", icon: User, label: "Perfil" },
    { path: "/help", icon: MessageSquare, label: "Ajuda" },
  ],
  admin: [
    { path: "/admin", icon: LayoutDashboard, label: "Admin" },
    { path: "/admin/curation", icon: Shield, label: "Curadoria" },
    { path: "/admin/users", icon: Users, label: "Users" },
    { path: "/admin/transactions", icon: Wallet, label: "Financeiro" },
    { path: "/profile", icon: User, label: "Perfil" },
  ],
};

/** Full sidebar (desktop/tablet) grouped items per role. */
export const sidebarByRole: Record<RoleKey, NavItem[]> = {
  customer: [
    { path: "/", icon: Home, label: "Início", group: "Principal" },
    { path: "/health/doctors", icon: Stethoscope, label: "Médicos", group: "Saúde" },
    { path: "/health/triage", icon: MessageSquare, label: "Meddy Consulta", group: "Saúde" },
    { path: "/health/consultations", icon: Calendar, label: "Minhas consultas", group: "Saúde" },
    { path: "/health/prescriptions", icon: FileText, label: "Receitas", group: "Saúde" },
    { path: "/health/exams", icon: FlaskConical, label: "Exames", group: "Saúde" },
    { path: "/health/records", icon: FileText, label: "Registos médicos", group: "Saúde" },
    { path: "/health/insurance", icon: Shield, label: "Seguros", group: "Saúde" },
    { path: "/blood", icon: Droplet, label: "Doação de sangue", group: "Comunidade" },
    { path: "/pharmacy", icon: Pill, label: "Farmácia", group: "Compras" },
    { path: "/orders", icon: ClipboardList, label: "Pedidos", group: "Compras" },
    { path: "/wallet", icon: Wallet, label: "Carteira", group: "Conta" },
    { path: "/subscriptions", icon: Shield, label: "Subscrições", group: "Conta" },
    { path: "/profile", icon: User, label: "Perfil", group: "Conta" },
    { path: "/help", icon: MessageSquare, label: "Ajuda", group: "Conta" },
  ],
  doctor: [
    { path: "/doctor/dashboard", icon: LayoutDashboard, label: "Painel", group: "Consultório" },
    { path: "/doctor/availability", icon: Calendar, label: "Agenda", group: "Consultório" },
    { path: "/health/consultations", icon: MessageSquare, label: "Consultas", group: "Consultório" },
    { path: "/doctor/patients", icon: Users, label: "Pacientes", group: "Consultório" },
    { path: "/doctor/prescription/new", icon: FileText, label: "Nova receita", group: "Consultório" },
    { path: "/wallet", icon: Wallet, label: "Carteira", group: "Conta" },
    { path: "/subscriptions", icon: Shield, label: "Subscrição", group: "Conta" },
    { path: "/profile", icon: User, label: "Perfil", group: "Conta" },
  ],
  clinic: [
    { path: "/clinic/dashboard", icon: LayoutDashboard, label: "Painel", group: "Clínica" },
    { path: "/health/doctors", icon: Stethoscope, label: "Médicos", group: "Clínica" },
    { path: "/health/consultations", icon: MessageSquare, label: "Consultas", group: "Clínica" },
    { path: "/blood", icon: Droplet, label: "Doação de sangue", group: "Comunidade" },
    { path: "/wallet", icon: Wallet, label: "Carteira", group: "Conta" },
    { path: "/profile", icon: User, label: "Perfil", group: "Conta" },
  ],
  hospital: [
    { path: "/clinic/dashboard", icon: Hospital, label: "Painel", group: "Hospital" },
    { path: "/health/consultations", icon: MessageSquare, label: "Consultas", group: "Hospital" },
    { path: "/health/records", icon: FileText, label: "Registos", group: "Hospital" },
    { path: "/blood", icon: Droplet, label: "Banco de sangue", group: "Comunidade" },
    { path: "/wallet", icon: Wallet, label: "Carteira", group: "Conta" },
    { path: "/profile", icon: User, label: "Perfil", group: "Conta" },
  ],
  lab: [
    { path: "/lab/dashboard", icon: LayoutDashboard, label: "Painel", group: "Laboratório" },
    { path: "/health/exams", icon: FlaskConical, label: "Exames", group: "Laboratório" },
    { path: "/health/exams/my", icon: ClipboardList, label: "Pedidos", group: "Laboratório" },
    { path: "/wallet", icon: Wallet, label: "Carteira", group: "Conta" },
    { path: "/profile", icon: User, label: "Perfil", group: "Conta" },
  ],
  store_owner: [
    { path: "/store/dashboard", icon: LayoutDashboard, label: "Painel", group: "Loja" },
    { path: "/store/dashboard/orders", icon: Package, label: "Encomendas", group: "Loja" },
    { path: "/store/dashboard/products", icon: Pill, label: "Produtos", group: "Loja" },
    { path: "/store/dashboard/reports", icon: BarChart3, label: "Relatórios", group: "Loja" },
    { path: "/store/dashboard/settings", icon: Settings, label: "Definições", group: "Loja" },
    { path: "/wallet", icon: Wallet, label: "Carteira", group: "Conta" },
    { path: "/profile", icon: User, label: "Perfil", group: "Conta" },
  ],
  driver: [
    { path: "/driver/dashboard", icon: Truck, label: "Painel", group: "Entregas" },
    { path: "/driver/history", icon: ClipboardList, label: "Histórico", group: "Entregas" },
    { path: "/wallet", icon: Wallet, label: "Ganhos", group: "Conta" },
    { path: "/profile", icon: User, label: "Perfil", group: "Conta" },
  ],
  admin: [
    { path: "/admin", icon: LayoutDashboard, label: "Home", group: "Admin" },
    { path: "/admin/curation", icon: Shield, label: "Curadoria", group: "Admin" },
    { path: "/admin/stores", icon: Building2, label: "Lojas", group: "Instituições" },
    { path: "/admin/labs", icon: FlaskConical, label: "Laboratórios", group: "Instituições" },
    { path: "/admin/insurance", icon: Shield, label: "Seguros", group: "Instituições" },
    { path: "/admin/users", icon: Users, label: "Utilizadores", group: "Gestão" },
    { path: "/admin/drivers", icon: Truck, label: "Entregadores", group: "Gestão" },
    { path: "/admin/orders", icon: Package, label: "Encomendas", group: "Gestão" },
    { path: "/admin/transactions", icon: Wallet, label: "Financeiro", group: "Gestão" },
    { path: "/admin/subscriptions", icon: Shield, label: "Subscrições", group: "Gestão" },
    { path: "/admin/subscription-plans", icon: Shield, label: "Planos", group: "Gestão" },
    { path: "/admin/settings", icon: Settings, label: "Definições", group: "Sistema" },
    { path: "/profile", icon: User, label: "Perfil", group: "Conta" },
  ],
};