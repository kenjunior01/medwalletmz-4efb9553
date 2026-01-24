import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, MapPin, CreditCard, Bell, HelpCircle, LogOut, ChevronRight, Settings, Camera, Edit2, Package, Heart, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

const menuItems = [
  { icon: MapPin, label: "Meus Endereços", href: "/addresses" },
  { icon: CreditCard, label: "Métodos de Pagamento", href: "/payments" },
  { icon: Bell, label: "Notificações", href: "/notifications" },
  { icon: Settings, label: "Configurações", href: "/settings" },
  { icon: HelpCircle, label: "Ajuda & Suporte", href: "/help" },
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
  const [stats, setStats] = useState({ orders: 0, favorites: 0, coupons: 0 });

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
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
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
      const [ordersRes, favoritesRes, couponsRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("user_coupons").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("used_at", null),
      ]);

      setStats({
        orders: ordersRes.count || 0,
        favorites: favoritesRes.count || 0,
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
            <Heart className="h-6 w-6 mx-auto mb-1 text-secondary" />
            <p className="text-2xl font-bold text-secondary">0</p>
            <p className="text-xs text-muted-foreground">Favoritos</p>
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
          MoçambiApp v1.0.0
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
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <Heart className="h-6 w-6 mx-auto mb-1 text-secondary" />
          <p className="text-2xl font-bold text-secondary">{stats.favorites}</p>
          <p className="text-xs text-muted-foreground">Favoritos</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <Ticket className="h-6 w-6 mx-auto mb-1 text-accent" />
          <p className="text-2xl font-bold text-accent">{stats.coupons}</p>
          <p className="text-xs text-muted-foreground">Cupons</p>
        </div>
      </div>

      {/* Menu */}
      <div className="bg-card rounded-xl border border-border divide-y divide-border">
        {menuItems.map(({ icon: Icon, label, href }) => (
          <button
            key={label}
            onClick={() => toast.info("Funcionalidade em breve")}
            className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
          >
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1 text-left font-medium text-sm">{label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
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
        MoçambiApp v1.0.0
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
