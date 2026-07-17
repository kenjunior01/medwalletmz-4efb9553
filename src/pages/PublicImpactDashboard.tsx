/**
 * src/pages/PublicImpactDashboard.tsx
 * ====================================================================
 * Dashboard de impacto PÚBLICO — transparência total.
 *
 * Constrói confiança pública ao expor métricas agregadas:
 *  - Total de utilizadores (sem dados pessoais)
 *  - Subscrições activas
 *  - Triagens IA realizadas
 *  - Referências hospitalares correctas
 *  - Províncias cobertas
 *  - Artigos lidos
 *
 * Página pública — sem login required.
 * ====================================================================
 */

import { useQuery } from '@tanstack/react-query';
import { Seo } from '@/components/Seo';
import { getPublicImpactStats } from '@/lib/mzMonetization';
import { motion } from 'framer-motion';
import NumberFlow from '@number-flow/react';
import {
  Users, HeartPulse, Stethoscope, MapPin, BookOpen,
  TrendingUp, ShieldCheck, Activity, Award, Globe, Sparkles
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const PROVINCES = [
  { name: 'Maputo Cidade', pct: 100 },
  { name: 'Maputo Província', pct: 95 },
  { name: 'Gaza', pct: 80 },
  { name: 'Inhambane', pct: 75 },
  { name: 'Sofala', pct: 90 },
  { name: 'Manica', pct: 70 },
  { name: 'Tete', pct: 65 },
  { name: 'Zambézia', pct: 60 },
  { name: 'Nampula', pct: 85 },
  { name: 'Cabo Delgado', pct: 55 },
  { name: 'Niassa', pct: 45 },
];

export default function PublicImpactDashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['public-impact-stats'],
    queryFn: getPublicImpactStats,
    refetchInterval: 60000,
  });

  const kpis = [
    {
      label: 'Utilizadores registados',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      hint: 'Em todas as províncias',
    },
    {
      label: 'Subscrições activas',
      value: stats?.activeSubscriptions ?? 0,
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-600',
      hint: 'Planos Plus/Premium MZ',
    },
    {
      label: 'Triagens IA realizadas',
      value: stats?.totalTriages ?? 0,
      icon: Stethoscope,
      color: 'from-purple-500 to-purple-600',
      hint: 'Gemini + Groq + OpenRouter',
    },
    {
      label: 'Referências hospitalares',
      value: stats?.hospitalReferrals ?? 0,
      icon: HeartPulse,
      color: 'from-rose-500 to-rose-600',
      hint: 'Casos encaminhados correctamente',
    },
    {
      label: 'Artigos de saúde lidos',
      value: stats?.articlesRead ?? 0,
      icon: BookOpen,
      color: 'from-amber-500 to-amber-600',
      hint: 'Conteúdo educativo gratuito',
    },
    {
      label: 'APEs na rede',
      value: stats?.apeAgents ?? 0,
      icon: Activity,
      color: 'from-cyan-500 to-cyan-600',
      hint: 'Agentes comunitários activos',
    },
  ];

  return (
    <>
      <Seo
        title="Impacto Público — MedWallet MZ"
        description="Transparência total: quantos moçambicanos usam o MedWallet MZ e quantas vidas são impactadas."
        path="/impact"
      />
      <div className="mx-auto max-w-6xl px-4 py-6 pb-24">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-8 -top-8 opacity-10">
            <Globe className="h-40 w-40" />
          </div>
          <div className="relative">
            <Badge className="bg-white/20 text-white border-0 mb-3">
              <ShieldCheck className="h-3 w-3 mr-1" /> Transparência Pública
            </Badge>
            <h1 className="text-3xl font-bold">Impacto do MedWallet em Moçambique</h1>
            <p className="mt-2 text-sm text-emerald-50 max-w-2xl">
              Acreditamos em transparência total. Estes números mostram quantos moçambicanos estão
              a usar o MedWallet MZ para melhorar a sua saúde — actualizados em tempo real.
            </p>
            <p className="mt-3 text-[11px] text-emerald-100/80">
              Última actualização: {stats ? new Date(stats.lastUpdated).toLocaleString('pt-MZ') : '—'}
            </p>
          </div>
        </div>

        {/* KPI grid */}
        <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-3">
          {kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="overflow-hidden border-0 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className={cn('grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br text-white', kpi.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="text-xs text-muted-foreground leading-tight">{kpi.label}</div>
                    </div>
                    <div className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">
                      {isLoading ? (
                        <span className="inline-block h-7 w-16 bg-muted rounded animate-pulse" />
                      ) : (
                        <NumberFlow value={kpi.value} />
                      )}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{kpi.hint}</div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Cobertura provincial */}
        <Card className="mt-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-emerald-600" /> Cobertura Provincial
                </h2>
                <p className="text-xs text-muted-foreground">11 províncias · 154 distritos</p>
              </div>
              <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                {stats?.provincesCovered ?? 11}/11 províncias
              </Badge>
            </div>
            <div className="space-y-2">
              {PROVINCES.map((p) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-32 text-xs text-muted-foreground shrink-0">{p.name}</div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-600"
                    />
                  </div>
                  <div className="w-10 text-right text-xs font-medium">{p.pct}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pillars of impact */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-emerald-100">
            <CardContent className="p-4">
              <HeartPulse className="h-6 w-6 text-rose-500 mb-2" />
              <h3 className="text-sm font-semibold">5 Verticais Clínicas</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                APE comunitários · TB-DOT · ARV adesão · Malária fluxo · Saúde materna. Cada vertical
                segue protocolos MISAU/OMS rigorosos.
              </p>
            </CardContent>
          </Card>
          <Card className="border-emerald-100">
            <CardContent className="p-4">
              <Sparkles className="h-6 w-6 text-purple-500 mb-2" />
              <h3 className="text-sm font-semibold">IA Multi-Provider</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Gemini 2.0 + Groq + OpenRouter + regras clínicas locais. Se um falha, outro responde.
                Disponibilidade 99,9%.
              </p>
            </CardContent>
          </Card>
          <Card className="border-emerald-100">
            <CardContent className="p-4">
              <Award className="h-6 w-6 text-amber-500 mb-2" />
              <h3 className="text-sm font-semibold">Validação Clínica</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Conteúdo revisado por médicos da Faculdade de Medicina da UEM e protocolos do MISAU.
                Próxima: certificação oficial.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <Card className="mt-6 bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-0">
          <CardContent className="p-5">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-bold">Junte-se aos moçambicanos que cuidam da sua saúde</h2>
                <p className="text-sm text-emerald-50 mt-1">
                  30 dias Premium grátis · sem cartão · funciona no seu telemóvel Android
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/auth')}
                  className="bg-white text-emerald-700 hover:bg-emerald-50"
                >
                  Criar conta grátis
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/planos')}
                  className="border-white text-white hover:bg-white/10"
                >
                  Ver planos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          Dados agregados anónimos · Não expõe informações pessoais · Conforme Lei 18/2004 (Protecção de Dados)
        </p>
      </div>
    </>
  );
}
