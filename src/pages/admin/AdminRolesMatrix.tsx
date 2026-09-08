import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BentoCard, BentoGrid, GlassCard } from '@/components/ui/design-system';
import NumberFlow from '@number-flow/react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, ShieldCheck, Globe, Users, Stethoscope, Store, Truck,
  Building2, Crown, FlaskConical, Wallet, IdCard, HeartHandshake,
  Bike, Megaphone, User, Shield, Baby,
} from '@/components/icons/lucide-compat';

/* ------------------------------------------------------------------ */
/*  Catálogo de perfis operacionais (user_roles.app_role)              */
/* ------------------------------------------------------------------ */

interface RoleDef {
  key: string;
  label: string;
  icon: any;
  color: string;
  scope: string;
  powers: string[];
}

const ROLE_CATALOG: RoleDef[] = [
  {
    key: 'admin', label: 'Gestor Global', icon: Globe,
    color: 'bg-amber-500/10 text-amber-500', scope: 'Mundo inteiro',
    powers: [
      'Acesso total a todos os países e módulos',
      'Define permissões e limites dos gestores regionais',
      'Edita cores, banners, comissões e plataformas',
    ],
  },
  {
    key: 'country_manager', label: 'Gestor de País', icon: ShieldCheck,
    color: 'bg-blue-500/10 text-blue-500', scope: '1 país (atribuído)',
    powers: [
      'Aprova instituições, médicos e farmácias do país',
      'Publica banners e conteúdo regional',
      'Confirma pagamentos M-Pesa e monitoriza SOS',
      'Edita comissões e cores do país (com permissão)',
    ],
  },
  {
    key: 'regional_ceo', label: 'CEO Regional', icon: Crown,
    color: 'bg-violet-500/10 text-violet-500', scope: 'País em onboarding',
    powers: [
      'KPIs, metas trimestrais e ranking regional',
      'Acompanha onboarding e metas do país',
    ],
  },
  {
    key: 'regional_manager', label: 'Gestor Regional', icon: Shield,
    color: 'bg-cyan-500/10 text-cyan-500', scope: 'País (op. diárias)',
    powers: [
      'Operação diária: submissões, conteúdo, métricas',
      'Escopo limitado pelo Gestor Global',
    ],
  },
  {
    key: 'provincial_manager', label: 'Gestor Provincial (legado)', icon: IdCard,
    color: 'bg-slate-500/10 text-slate-400', scope: 'Consolidado em /manager',
    powers: [
      'Escopo provincial removido da base (2026-07)',
      'Redireccionado para o painel por país',
    ],
  },
  {
    key: 'doctor', label: 'Médico', icon: Stethoscope,
    color: 'bg-teal-500/10 text-teal-500', scope: 'Própria agenda',
    powers: ['Consultas, receitas digitais e pacientes'],
  },
  {
    key: 'store_owner', label: 'Farmácia / Loja', icon: Store,
    color: 'bg-purple-500/10 text-purple-500', scope: 'Próprio estabelecimento',
    powers: ['Catálogo, pedidos e entregas'],
  },
  {
    key: 'clinic', label: 'Clínica', icon: Building2,
    color: 'bg-emerald-500/10 text-emerald-500', scope: 'Própria instituição',
    powers: ['Marcação de consultas e professionals'],
  },
  {
    key: 'lab', label: 'Laboratório', icon: FlaskConical,
    color: 'bg-pink-500/10 text-pink-500', scope: 'Próprio laboratório',
    powers: ['Pedidos de análises e resultados'],
  },
  {
    key: 'driver', label: 'Rider', icon: Bike,
    color: 'bg-orange-500/10 text-orange-500', scope: 'Entregas activas',
    powers: ['Aceita entregas e ganha por corrida'],
  },
  {
    key: 'insurance', label: 'Seguradora', icon: Wallet,
    color: 'bg-sky-500/10 text-sky-500', scope: 'Próprios planos',
    powers: ['Seguros de saúde e sinistros'],
  },
  {
    key: 'customer', label: 'Utilizador', icon: User,
    color: 'bg-blue-500/10 text-blue-400', scope: 'Conta pessoal',
    powers: ['Carteira, consultas, farmácia e comunidade'],
  },
];

/* ------------------------------------------------------------------ */
/*  Personas (profiles.user_type)                                      */
/* ------------------------------------------------------------------ */

const PERSONA_CATALOG = [
  { key: 'patient', label: 'Doente', icon: HeartHandshake, color: 'bg-rose-500/10 text-rose-500' },
  { key: 'rider', label: 'Rider', icon: Bike, color: 'bg-orange-500/10 text-orange-500' },
  { key: 'worker', label: 'Profissional', icon: Stethoscope, color: 'bg-teal-500/10 text-teal-500' },
  { key: 'caregiver', label: 'Cuidador', icon: Baby, color: 'bg-violet-500/10 text-violet-500' },
  { key: 'promoter', label: 'Promotor', icon: Megaphone, color: 'bg-amber-500/10 text-amber-500' },
];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

/* ------------------------------------------------------------------ */
/*  Página                                                             */
/* ------------------------------------------------------------------ */

export default function AdminRolesMatrix() {
  const [search, setSearch] = useState('');

  // Contagem por papel (user_roles)
  const { data: roleCounts, isLoading: rolesLoading } = useQuery({
    queryKey: ['admin-role-matrix-roles'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_roles')
        .select('role');
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const r of data || []) {
        const k = (r as any).role as string;
        counts[k] = (counts[k] || 0) + 1;
      }
      return counts;
    },
  });

  // Contagem por persona (profiles.user_type)
  const { data: typeCounts, isLoading: typesLoading } = useQuery({
    queryKey: ['admin-role-matrix-types'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('user_type');
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const r of data || []) {
        const k = ((r as any).user_type as string) || 'patient';
        counts[k] = (counts[k] || 0) + 1;
      }
      return counts;
    },
  });

  // Cobertura de permissões de gestores
  const { data: permsRows } = useQuery({
    queryKey: ['admin-role-matrix-perms'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('manager_permissions')
        .select('user_id, country_id, daily_approval_limit, max_active_content');
      if (error) return [];
      return (data || []) as any[];
    },
  });

  const filteredRoles = useMemo(() => {
    if (!search.trim()) return ROLE_CATALOG;
    const q = search.toLowerCase();
    return ROLE_CATALOG.filter(
      (r) => r.label.toLowerCase().includes(q) || r.key.includes(q)
    );
  }, [search]);

  const totalUsers = Object.values(typeCounts || {}).reduce((a, b) => a + b, 0);
  const totalRoleAssignments = Object.values(roleCounts || {}).reduce((a, b) => a + b, 0);
  const managersCount =
    (roleCounts?.country_manager || 0) + (roleCounts?.regional_manager || 0) + (roleCounts?.regional_ceo || 0);

  if (rolesLoading || typesLoading) {
    return (
      <div className="space-y-4 p-1">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-xl font-black">Perfis & Tipos de Conta</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão completa dos papéis operacionais (user_roles) e personas
          (user_type) da plataforma — quem existe, o que cada perfil pode
          fazer e como estão distribuídos.
        </p>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={fadeUp}>
        <BentoGrid className="grid-cols-2 sm:grid-cols-4">
          <BentoCard size="sm" className="text-center">
            <Users className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={totalUsers} /></p>
            <p className="text-[10px] text-muted-foreground uppercase">Pessoas</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <Shield className="h-5 w-5 mx-auto text-violet-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={totalRoleAssignments} /></p>
            <p className="text-[10px] text-muted-foreground uppercase">Atribuições de Papel</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <ShieldCheck className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={managersCount} /></p>
            <p className="text-[10px] text-muted-foreground uppercase">Gestores</p>
          </BentoCard>
          <BentoCard size="sm" className="text-center">
            <IdCard className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-xl font-black tabular-nums"><NumberFlow value={(permsRows || []).length} /></p>
            <p className="text-[10px] text-muted-foreground uppercase">Com Permissões</p>
          </BentoCard>
        </BentoGrid>
      </motion.div>

      {/* Pesquisa */}
      <motion.div variants={fadeUp}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar papel (ex.: médico, admin, rider…)"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </motion.div>

      {/* Matriz de papéis */}
      <motion.div variants={fadeUp}>
        <h2 className="font-bold text-base mb-2">Papéis Operacionais (user_roles)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredRoles.map((role) => {
            const count = roleCounts?.[role.key] || 0;
            return (
              <GlassCard key={role.key} className="!p-4">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${role.color}`}>
                    <role.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm">{role.label}</p>
                      <Badge variant="outline" className="text-[10px] h-4.5 px-1.5">
                        {count} {count === 1 ? 'conta' : 'contas'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {role.key} · {role.scope}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {role.powers.map((p) => (
                        <li key={p} className="text-[11px] text-muted-foreground flex gap-1.5">
                          <span className="text-primary leading-5">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </motion.div>

      {/* Personas */}
      <motion.div variants={fadeUp}>
        <h2 className="font-bold text-base mb-2">Personas (profiles.user_type)</h2>
        <BentoGrid className="grid-cols-2 sm:grid-cols-5">
          {PERSONA_CATALOG.map((p) => {
            const count = typeCounts?.[p.key] || 0;
            return (
              <BentoCard key={p.key} size="sm" className="text-center">
                <p.icon className={`h-5 w-5 mx-auto mb-1 ${p.color.split(' ')[1]}`} />
                <p className="text-lg font-black tabular-nums"><NumberFlow value={count} /></p>
                <p className="text-[10px] text-muted-foreground uppercase">{p.label}</p>
              </BentoCard>
            );
          })}
        </BentoGrid>
        <p className="text-[11px] text-muted-foreground mt-2">
          A persona é o tipo de perfil escolhido pelo utilizador (app
          Flutter: Perfil → Tipo de perfil). Papéis operacionais e personas
          coexistem: um utilizador pode ser «Doente» e, em simultâneo,
          «Gestor de País».
        </p>
      </motion.div>
    </motion.div>
  );
}
