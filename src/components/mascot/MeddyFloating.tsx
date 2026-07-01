import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Meddy, type MeddyRole, type MeddyState } from './Meddy';
import { pickMeddyMessage, type MeddyMessage, type Context } from './MeddyMessages';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Send, Sparkles, Minimize2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface Props {
  context?: Context;
  /** posição inicial do floating button */
  position?: 'bottom-right' | 'bottom-left';
}

/**
 * MeddyFloating — mascote persistente em todas as páginas autenticadas.
 *
 *  - Botão circular pequeno (60px) no canto inferior
 *  - Click expande um painel com greeting contextual + acções rápidas
 *  - Pode ser dispensado (X) mas volta na próxima sessão
 *  - Adapta o role via useUserRoles() — patient, doctor, pharmacist, etc.
 */
export function MeddyFloating({ context = 'default', position = 'bottom-right' }: Props) {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [lastText, setLastText] = useState<string | undefined>();

  // Detectar role principal
  const role: MeddyRole = (() => {
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('doctor')) return 'doctor';
    if (roles.includes('store_owner')) return 'pharmacist';
    if (roles.includes('driver')) return 'driver';
    if (roles.includes('clinic')) return 'clinic';
    return 'patient';
  })();

  const { data: profile } = useQuery<any>({
    queryKey: ['meddy-profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, default_city, phone')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });

  const { data: metric = 0 } = useQuery<number>({
    queryKey: ['meddy-metric', role, user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (role === 'admin') {
        const { count } = await (supabase as any)
          .from('place_proposals')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'in_review']);
        return count ?? 0;
      }
      if (role === 'doctor') {
        const { count } = await (supabase as any)
          .from('consultations')
          .select('id', { count: 'exact', head: true })
          .eq('doctor_id', user!.id)
          .in('status', ['scheduled', 'confirmed', 'in_progress']);
        return count ?? 0;
      }
      if (role === 'pharmacist') {
        const { data: store } = await (supabase as any)
          .from('stores')
          .select('id')
          .eq('owner_id', user!.id)
          .maybeSingle();
        if (!store?.id) return 0;
        const { count } = await (supabase as any)
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)
          .in('status', ['pending', 'confirmed', 'preparing']);
        return count ?? 0;
      }
      if (role === 'driver') {
        const { count } = await (supabase as any)
          .from('driver_assignments')
          .select('id', { count: 'exact', head: true })
          .eq('driver_id', user!.id)
          .in('status', ['assigned', 'picked_up']);
        return count ?? 0;
      }
      const { count } = await (supabase as any)
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .in('status', ['pending', 'confirmed', 'preparing', 'out_for_delivery']);
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  // Re-pick quando muda contexto (a cada abertura) — tem de vir ANTES do early return
  useEffect(() => {
    if (open) setLastText(undefined);
  }, [open, context]);

  // Não mostrar para utilizadores não autenticados (Auth page mostra login)
  if (!user || dismissed) return null;

  const state: MeddyState = open ? 'waving' : 'idle';
  const message = pickMeddyMessage(role, context, lastText);
  const firstName = useMemo(() => {
    const source = profile?.full_name || user.email?.split('@')[0] || 'amigo';
    return String(source).trim().split(/\s+/)[0];
  }, [profile?.full_name, user.email]);
  const personalizedText = message?.text
    .replaceAll('XXXX', String(metric))
    .replaceAll('{{name}}', firstName)
    .replaceAll('{{city}}', profile?.default_city || 'Moçambique');

  const cycleMessage = () => {
    if (message) setLastText(message.text);
  };

  const posClass = position === 'bottom-right'
    ? 'right-4 bottom-20 md:bottom-4'
    : 'left-4 bottom-20 md:bottom-4';

  return (
    <>
      {/* Botão flutuante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "fixed z-40 hover:scale-105 active:scale-95 transition-transform",
            posClass,
          )}
          aria-label="Abrir Meddy, mascote da MedWallet"
        >
          <Meddy role={role} state="happy" size={64} className="drop-shadow-lg" />
          {/* Pulse dot */}
          <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-emerald-500 animate-pulse border-2 border-background" />
        </button>
      )}

      {/* Painel expandido */}
      {open && (
        <div
          className={cn(
            "fixed z-50 w-[320px] max-w-[calc(100vw-2rem)]",
            position === 'bottom-right'
              ? 'right-4 bottom-20 md:bottom-4'
              : 'left-4 bottom-20 md:bottom-4',
          )}
        >
          <Card className="overflow-hidden border-primary/30 shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-secondary p-3 flex items-center gap-2 text-primary-foreground">
              <Meddy role={role} state="happy" size={48} />
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm flex items-center gap-1">
                  Meddy <Sparkles className="h-3 w-3" />
                </p>
                <p className="text-[10px] opacity-90">
                  Assistente da MedWallet · {roleLabel(role)}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setOpen(false)}
                className="text-primary-foreground hover:bg-white/20 h-7 w-7">
                <Minimize2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Mensagem */}
            {message && (
              <div className="p-3 bg-card">
                <p className="text-sm leading-relaxed">
                  {personalizedText}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={cycleMessage}>
                    Outra mensagem 🔄
                  </Button>
                  {message.actionLabel && message.actionHref && (
                    <Button
                      size="sm"
                      className="h-7 text-xs ml-auto"
                      onClick={() => { setOpen(false); navigate(message.actionHref!); }}
                    >
                      {message.actionLabel}
                      <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Quick actions (dependendo do role) */}
            <div className="p-3 pt-0 bg-card">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2 tracking-wider">
                Atalhos rápidos
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {quickActionsFor(role).map((qa) => (
                  <button
                    key={qa.href}
                    onClick={() => { setOpen(false); navigate(qa.href); }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-xs text-left transition"
                  >
                    <qa.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">{qa.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-muted/40 px-3 py-2 flex items-center justify-between">
              <button
                onClick={() => { setDismissed(true); setOpen(false); }}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Esconder Meddy
              </button>
              <button
                onClick={cycleMessage}
                className="text-[10px] text-primary font-semibold flex items-center gap-0.5"
              >
                <Send className="h-3 w-3" /> Dica
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Backdrop invisível para fechar ao clicar fora */}
      {open && (
        <button
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-background/20 backdrop-blur-sm"
          aria-label="Fechar Meddy"
        />
      )}
    </>
  );
}

function quickActionsFor(role: MeddyRole) {
  switch (role) {
    case 'doctor':
      return [
        { icon: StethoscopeIcon, label: 'Dashboard', href: '/doctor/dashboard' },
        { icon: CalendarIcon,    label: 'Disponibilidade', href: '/doctor/availability' },
        { icon: PatientIcon,     label: 'Pacientes', href: '/doctor/patients' },
        { icon: WalletIcon,      label: 'Carteira', href: '/wallet' },
      ];
    case 'pharmacist':
      return [
        { icon: PillIcon,        label: 'Loja', href: '/store/dashboard' },
        { icon: ClipboardIcon,    label: 'Pedidos', href: '/store/dashboard/orders' },
        { icon: PackageIcon,      label: 'Produtos', href: '/store/dashboard/products' },
        { icon: WalletIcon,      label: 'Carteira', href: '/wallet' },
      ];
    case 'driver':
      return [
        { icon: TruckIcon,       label: 'Dashboard', href: '/driver/dashboard' },
        { icon: HistoryIcon,     label: 'Histórico', href: '/driver/history' },
        { icon: MapIcon,          label: 'Mapa', href: '/' },
        { icon: WalletIcon,      label: 'Carteira', href: '/wallet' },
      ];
    case 'clinic':
      return [
        { icon: BuildingIcon,     label: 'Dashboard', href: '/clinic/dashboard' },
        { icon: CalendarIcon,    label: 'Marcações', href: '/health/doctors' },
        { icon: WalletIcon,      label: 'Carteira', href: '/wallet' },
      ];
    case 'admin':
      return [
        { icon: ShieldIcon,      label: 'Curadoria', href: '/admin/curation' },
        { icon: UploadIcon,      label: 'Importar', href: '/admin/import' },
        { icon: UsersIcon,       label: 'Utilizadores', href: '/admin/users' },
        { icon: WalletIcon,      label: 'Transações', href: '/admin/transactions' },
      ];
    default:
      return [
        { icon: StethoscopeIcon, label: 'Médicos', href: '/health/doctors' },
        { icon: PillIcon,        label: 'Farmácia', href: '/pharmacy' },
        { icon: BookIcon,        label: 'Saúde MZ', href: '/health/education' },
        { icon: SuggestIcon,     label: 'Sugerir local', href: '/suggest-place' },
      ];
  }
}

// Inline icon stubs (lazy: 1-elementos)
function StethoscopeIcon(props: any) { return <Stethoscope {...props} />; }
function CalendarIcon(props: any)    { return <Calendar {...props} />; }
function PatientIcon(props: any)     { return <Users {...props} />; }
function WalletIcon(props: any)      { return <Wallet {...props} />; }
function PillIcon(props: any)        { return <Pill {...props} />; }
function ClipboardIcon(props: any)    { return <Clipboard {...props} />; }
function PackageIcon(props: any)      { return <Package {...props} />; }
function TruckIcon(props: any)       { return <Truck {...props} />; }
function HistoryIcon(props: any)     { return <History {...props} />; }
function MapIcon(props: any)         { return <Map {...props} />; }
function BuildingIcon(props: any)    { return <Building2 {...props} />; }
function ShieldIcon(props: any)      { return <Shield {...props} />; }
function UploadIcon(props: any)      { return <Upload {...props} />; }
function UsersIcon(props: any)       { return <Users {...props} />; }
function BookIcon(props: any)        { return <BookOpen {...props} />; }
function SuggestIcon(props: any)     { return <MapPinPlus {...props} />; }

// Icons (real)
import { Stethoscope, Calendar, Users, Wallet, Pill, Clipboard, Package, Truck, History, Map, Shield, Upload, BookOpen, MapPinPlus, Building2 } from 'lucide-react';

function roleLabel(r: MeddyRole): string {
  return {
    patient: 'Paciente',
    doctor: 'Médico',
    pharmacist: 'Farmacêutico',
    driver: 'Entregador',
    clinic: 'Clínica',
    admin: 'Admin',
  }[r];
}