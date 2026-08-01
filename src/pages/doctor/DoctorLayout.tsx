import { Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  FileText,
  Wallet,
  Stethoscope,
} from "@/components/icons/lucide-compat";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardShell, type DashboardMenuItem } from "@/components/layout/DashboardShell";

const menuItems: DashboardMenuItem[] = [
  { icon: LayoutDashboard, label: "Painel", path: "/doctor/dashboard" },
  { icon: Users, label: "Pacientes", path: "/doctor/patients" },
  { icon: CalendarClock, label: "Horários", path: "/doctor/availability" },
  { icon: FileText, label: "Nova Receita", path: "/doctor/prescription/new", highlight: true },
  { icon: Stethoscope, label: "Perfil Médico", path: "/doctor/profile" },
  { icon: Wallet, label: "Carteira", path: "/wallet" },
];

export default function DoctorLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <DashboardShell
      title="Painel Médico"
      badge="Profissional de Saúde"
      menuItems={menuItems}
      brand={
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          MedWallet
        </h1>
      }
      onSignOut={async () => {
        await signOut();
        navigate("/");
      }}
    >
      <Outlet />
    </DashboardShell>
  );
}
