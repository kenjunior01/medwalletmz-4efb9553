import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, MapPin, Bell, HelpCircle, LogOut, ChevronRight, Settings, Camera, Edit2, Package, FileText, Ticket, Store, Truck, Crown, Wallet, Stethoscope, Building2, Gift, PlusCircle, Award, History, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { LowDataToggle } from "@/components/profile/LowDataToggle";
import { UserProposalsWidget } from "@/components/places/UserProposalsWidget";
import { LanguageSelector } from "@/components/layout/LanguageSelector";

type Profile = Tables<"profiles">;

const menuItems = [
  { icon: Wallet, label: "Minha Carteira", href: "/wallet" },
  { icon: MapPin, label: "Meus Endereços", href: "/addresses" },
  { icon: PlusCircle, label: "Sugerir farmácia ou clínica", href: "/suggest-place", highlight: true, reward: true },
  { icon: Gift, label: "Convidar Amigos", href: "/referrals" },
  { icon: Crown, label: "Minhas Subscrições", href: "/subscriptions" },
  { icon: Wallet, label: "Dados de Pagamento", href: "/payment-settings" },
  { icon: Bell, label: "Notificações", href: "/notifications" },
  { icon: Settings, label: "Configurações", href: "/settings" },
  { icon: HelpCircle, label: "Ajuda & Suporte", href: "/help" },
  { icon: ShieldCheck, label: "Termos Legais", href: "/legal" },
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ orders: 0, prescriptions: 0, coupons: 0 });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data: rows, error } = await supabase
        .rpc("get_profile_private" as any, { _user_id: user.id } as any)
      if (error && (error as any).code !== 'PGRST116') throw error;
      const data: any = Array.isArray(rows) ? rows[0] : rows;
      if (data) {
        setProfile(data);
        setEditName(data.full_name || "");
        setEditPhone(data.phone || "");
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      const ordersRes = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      const rxRes = await supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("patient_id", user.id);
      const couponsRes = await supabase.from("user_coupons").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("used_at", null);

      setStats({
        orders: ordersRes.count || 0,
        prescriptions: rxRes.count || 0,
        coupons: couponsRes.count || 0,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editName,
          phone: editPhone,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile((prev) => prev ? { ...prev, full_name: editName, phone: editPhone } : null);
      setEditOpen(false);
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Guest view
  if (!user) {
    return (
      <div className="flex flex-col gap-6 p-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Visitante</h1>
            <p className="text-sm text-muted-foreground">Faça login para continuar</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate("/auth")}>
            Entrar
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <Package className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold text-primary">0</p>
            <p className="text-xs text-muted-foreground">Pedidos</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <FileText className="h-6 w-6 mx-auto mb-1 text-secondary" />
            <p className="text-2xl font-bold text-secondary">0</p>
            <p className="text-xs text-muted-foreground">Receitas</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <Ticket className="h-6 w-6 mx-auto mb-1 text-accent" />
            <p className="text-2xl font-bold text-accent">0</p>
            <p className="text-xs text-muted-foreground">Cupons</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border divide-y divide-border">
          {menuItems.map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => navigate("/auth")}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
            >
              <Icon className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium text-sm">{label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          MedWallet v1.0.0
        </p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 animate-fade-in">
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-primary" />
            )}
          </div>
          <button className="absolute -bottom-1 -right-1 p-1.5 bg-primary rounded-full text-primary-foreground">
            <Camera className="h-3 w-3" />
          </button>
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{profile?.full_name || "Utilizador"}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          {profile?.phone && (
            <p className="text-xs text-muted-foreground">{profile.phone}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <button 
          onClick={() => navigate("/orders")}
          className="bg-card rounded-xl border border-border p-3 text-center hover:bg-muted/50 transition-colors"
        >
          <Package className="h-6 w-6 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold text-primary">{stats.orders}</p>
          <p className="text-xs text-muted-foreground">Pedidos</p>
        </button>
        <button 
          onClick={() => navigate("/health/prescriptions")}
          className="bg-card rounded-xl border border-border p-3 text-center hover:bg-muted/50 transition-colors"
        >
          <FileText className="h-6 w-6 mx-auto mb-1 text-secondary" />
          <p className="text-2xl font-bold text-secondary">{stats.prescriptions}</p>
          <p className="text-xs text-muted-foreground">Receitas</p>
        </button>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <Ticket className="h-6 w-6 mx-auto mb-1 text-accent" />
          <p className="text-2xl font-bold text-accent">{stats.coupons}</p>
          <p className="text-xs text-muted-foreground">Cupons</p>
        </div>
      </div>

      {/* Menu */}
      <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
        {menuItems.map(({ icon: Icon, label, href, highlight, reward }) => (
          <button
            key={label}
            onClick={() => href.startsWith('/') ? navigate(href) : toast.info("Funcionalidade em breve")}
            className={`w-full flex items-center gap-3 p-4 transition-colors ${
              highlight
                ? "bg-gradient-to-r from-gold/10 via-transparent to-secondary/10 hover:from-gold/15"
                : "hover:bg-muted/50"
            }`}
          >
            <Icon className={`h-5 w-5 ${highlight ? "text-gold" : "text-muted-foreground"}`} />
            <div className="flex-1 text-left">
              <span className="font-medium text-sm block">{label}</span>
              {reward && (
                <span className="text-[10px] text-gold font-bold inline-flex items-center gap-0.5">
                  <Award className="h-3 w-3" /> +25 MZN por aprovação
                </span>
              )}
            </div>
            {highlight ? (
              <span className="text-[9px] font-bold bg-gold/20 text-gold px-1.5 py-0.5 rounded">NOVO</span>
            ) : null}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* Sugestões submetidas */}
      {user && (
        <UserProposalsWidget userId={user.id} />
      )}

      {/* Preferências locais */}
      <div className="space-y-4">
        <LowDataToggle />
        <div className="bg-card rounded-xl border border-border p-2">
          <LanguageSelector />
        </div>
      </div>

      {/* Business Options */}
      <div className="bg-card rounded-xl border border-border divide-y divide-border">
        <button
          onClick={() => navigate("/doctor/register")}
          className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
        >
          <Stethoscope className="h-5 w-5 text-pharmacy" />
          <div className="flex-1 text-left">
            <span className="font-medium text-sm block">Seja Médico Parceiro</span>
            <span className="text-xs text-muted-foreground">Atenda pacientes online</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={() => navigate("/clinic/register")}
          className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
        >
          <Building2 className="h-5 w-5 text-gold" />
          <div className="flex-1 text-left">
            <span className="font-medium text-sm block">Registar Clínica</span>
            <span className="text-xs text-muted-foreground">Gerir equipa de médicos</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={() => navigate("/store/register")}
          className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
        >
          <Store className="h-5 w-5 text-green-500" />
          <div className="flex-1 text-left">
            <span className="font-medium text-sm block">Registar Farmácia</span>
            <span className="text-xs text-muted-foreground">Venda medicamentos online</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={() => navigate("/driver/register")}
          className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
        >
          <Truck className="h-5 w-5 text-orange-500" />
          <div className="flex-1 text-left">
            <span className="font-medium text-sm block">Seja um Entregador</span>
            <span className="text-xs text-muted-foreground">Entregue medicamentos com prioridade</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Logout */}
      <Button 
        variant="ghost" 
        className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleLogout}
      >
        <LogOut className="h-5 w-5" />
        Terminar Sessão
      </Button>

      {/* App Version */}
      <p className="text-center text-xs text-muted-foreground">
        MedWallet v1.0.0
      </p>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nome Completo</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Telefone</label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+258 84 000 0000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
