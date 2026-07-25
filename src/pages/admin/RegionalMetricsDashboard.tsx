import { useState, useMemo, useEffect } from 'react';
import {
  Globe, MapPin, Users, Building2, TrendingUp, TrendingDown, CreditCard,
  ChevronDown, ChevronUp, Layers, DollarSign, UserCheck, ShoppingCart,
  Stethoscope, Activity, BarChart3, Eye, Download, Filter, ArrowUpRight,
  ArrowDownRight, Target, Zap, Clock, Star as StarIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { REGIONS, getCountriesByRegion, useCountry } from "@/contexts/CountryContext";
import type { Country } from "@/contexts/CountryContext";
import { supabase } from '@/integrations/supabase/client';

// ====== TYPES ======

interface CountryMetrics {
  users: number;
  activeUsers: number;
  revenue: number;
  orders: number;
  doctors: number;
  pharmacies: number;
  institutions: number;
  growth: number;
  avgRating: number;
  pendingVerifications: number;
  regionalManagers: number;
  churnRate: number;
  avgOrderValue: number;
}

interface RegionMetrics extends CountryMetrics {
  totalUsersFormatted: string;
  totalRevenueFormatted: string;
  growthPositive: boolean;
  topCountry: string;
}

// ====== HELPERS ======

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatCurrency(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function isoToFlag(iso: string): string {
  const codePoints = iso.toUpperCase().split("").map((char) => 0x1f1e6 + char.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric' }));
  }
  return days;
}

function aggregateRegionMetrics(countryMetricsMap: Record<string, CountryMetrics>, countries: Country[]): RegionMetrics {
  let totalUsers = 0, activeUsers = 0, revenue = 0, orders = 0, doctors = 0;
  let pharmacies = 0, institutions = 0, pendingVerifications = 0, regionalManagers = 0;
  let totalRating = 0, ratingCount = 0, totalGrowth = 0, totalChurn = 0, totalOrderValue = 0;

  countries.forEach(c => {
    const m = countryMetricsMap[c.id];
    if (!m) return;
    totalUsers += m.users;
    activeUsers += m.activeUsers;
    revenue += m.revenue;
    orders += m.orders;
    doctors += m.doctors;
    pharmacies += m.pharmacies;
    institutions += m.institutions;
    pendingVerifications += m.pendingVerifications;
    regionalManagers += m.regionalManagers;
    totalRating += m.avgRating;
    ratingCount++;
    totalGrowth += m.growth;
    totalChurn += m.churnRate;
    totalOrderValue += m.avgOrderValue;
  });

  const growthRate = countries.length > 0 ? totalGrowth / countries.length : 0;
  const churnRate = countries.length > 0 ? totalChurn / countries.length : 0;
  const avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;
  const avgOrderValue = countries.length > 0 ? totalOrderValue / countries.length : 0;

  return {
    users: totalUsers,
    activeUsers,
    revenue,
    orders,
    doctors,
    pharmacies,
    institutions,
    growth: growthRate,
    avgRating,
    pendingVerifications,
    regionalManagers,
    churnRate,
    avgOrderValue,
    totalUsersFormatted: formatNumber(totalUsers),
    totalRevenueFormatted: formatCurrency(revenue),
    growthPositive: growthRate >= 0,
    topCountry: countries[0]?.id || '',
  };
}

// ====== MAIN COMPONENT ======

export default function RegionalMetricsDashboard() {
  const { allCountries } = useCountry();
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [viewMode, setViewMode] = useState<'overview' | 'comparison' | 'performance'>('overview');
  const [countryMetrics, setCountryMetrics] = useState<Record<string, CountryMetrics>>({});
  const [loading, setLoading] = useState(true);
  const [weeklyActivity, setWeeklyActivity] = useState<number[]>([]);

  const regionData = useMemo(() => getCountriesByRegion(allCountries), [allCountries]);
  const selectedRegion = regionData.find((r) => r.id === selectedRegionId) ?? null;
  const selectedCountry = selectedRegion?.items.find(c => c.id === selectedCountryId) ?? null;
  const totalCountries = allCountries.length;
  const totalCities = allCountries.reduce((sum, c) => sum + (c.config?.cities?.length || 0), 0);

  // Load real metrics from Supabase
  useEffect(() => {
    loadAllMetrics();
  }, [allCountries]);

  const loadAllMetrics = async () => {
    setLoading(true);
    const metricsMap: Record<string, CountryMetrics> = {};
    const countryIds = allCountries.map(c => c.id);
    if (countryIds.length === 0) { setLoading(false); return; }

    const startMonth = new Date();
    startMonth.setDate(1);
    startMonth.setHours(0, 0, 0, 0);

    const startPrevMonth = new Date(startMonth);
    startPrevMonth.setMonth(startPrevMonth.getMonth() - 1);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Load weekly order activity
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      const { data: weekOrders } = await (supabase as any).from('orders')
        .select('created_at')
        .gte('created_at', weekStart.toISOString());
      
      if (weekOrders) {
        const dayCounts = Array(7).fill(0);
        weekOrders.forEach((o: any) => {
          const d = new Date(o.created_at);
          const dayIdx = 6 - Math.floor((weekStart.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
          if (dayIdx >= 0 && dayIdx < 7) dayCounts[6 - dayIdx]++;
        });
        setWeeklyActivity(dayCounts);
      }
    } catch { setWeeklyActivity([]); }

    // Load metrics per country
    await Promise.all(countryIds.map(async (cc) => {
      try {
        const [usersRes, activeUsersRes, doctorsRes, storesRes, clinicsRes, ordersRes, ordersPrevRes, revenueRes, pendingDocsRes, pendingStoresRes, managersRes] = await Promise.all([
          (supabase as any).from('profiles').select('id', { count: 'exact', head: true }).eq('country_id', cc),
          (supabase as any).from('profiles').select('id', { count: 'exact', head: true }).eq('country_id', cc).gte('last_sign_in_at', thirtyDaysAgo.toISOString()),
          (supabase as any).from('doctor_profiles').select('id', { count: 'exact', head: true }).eq('country_code', cc),
          (supabase as any).from('stores').select('id', { count: 'exact', head: true }).eq('country_code', cc),
          (supabase as any).from('clinics').select('id', { count: 'exact', head: true }).eq('country_code', cc),
          (supabase as any).from('orders').select('id', { count: 'exact', head: true }).eq('country_code', cc).gte('created_at', startMonth.toISOString()),
          (supabase as any).from('orders').select('id', { count: 'exact', head: true }).eq('country_code', cc).gte('created_at', startPrevMonth.toISOString()).lt('created_at', startMonth.toISOString()),
          (supabase as any).from('orders').select('total').eq('country_code', cc).gte('created_at', startMonth.toISOString()).eq('status', 'delivered'),
          (supabase as any).from('doctor_profiles').select('id', { count: 'exact', head: true }).eq('country_code', cc).eq('is_verified', false),
          (supabase as any).from('stores').select('id', { count: 'exact', head: true }).eq('country_code', cc).eq('is_verified', false),
          (supabase as any).from('country_management').select('id', { count: 'exact', head: true }).eq('country_id', cc),
        ]);

        const totalRevenue = (revenueRes.data || []).reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
        const currOrders = ordersRes.count || 0;
        const prevOrders = ordersPrevRes.count || 0;
        const growth = prevOrders > 0 ? ((currOrders - prevOrders) / prevOrders) * 100 : (currOrders > 0 ? 100 : 0);

        metricsMap[cc] = {
          users: usersRes.count || 0,
          activeUsers: activeUsersRes.count || 0,
          revenue: totalRevenue,
          orders: currOrders,
          doctors: doctorsRes.count || 0,
          pharmacies: storesRes.count || 0,
          institutions: clinicsRes.count || 0,
          growth: Math.round(growth * 10) / 10,
          avgRating: 0,
          pendingVerifications: (pendingDocsRes.count || 0) + (pendingStoresRes.count || 0),
          regionalManagers: managersRes.count || 0,
          churnRate: 0,
          avgOrderValue: currOrders > 0 ? Math.round(totalRevenue / currOrders) : 0,
        };
      } catch {
        metricsMap[cc] = { users: 0, activeUsers: 0, revenue: 0, orders: 0, doctors: 0, pharmacies: 0, institutions: 0, growth: 0, avgRating: 0, pendingVerifications: 0, regionalManagers: 0, churnRate: 0, avgOrderValue: 0 };
      }
    }));

    setCountryMetrics(metricsMap);
    setLoading(false);
  };

  // Aggregate global metrics from real data
  const globalMetrics = useMemo(() => {
    const allMetrics = Object.values(countryMetrics);
    return {
      totalUsers: allMetrics.reduce((s, m) => s + m.users, 0),
      totalRevenue: allMetrics.reduce((s, m) => s + m.revenue, 0),
      totalTransactions: allMetrics.reduce((s, m) => s + m.orders, 0),
      totalDoctors: allMetrics.reduce((s, m) => s + m.doctors, 0),
      totalPharmacies: allMetrics.reduce((s, m) => s + m.pharmacies, 0),
      activeCountries: totalCountries,
      activeRegions: regionData.length,
    };
  }, [countryMetrics, totalCountries, regionData.length]);

  const weekDays = getLast7Days();
  const maxWeekly = Math.max(...weeklyActivity, 1);

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              <span className="text-gradient-premium">Painel Regional</span>
            </h1>
            <p className="text-sm text-muted-foreground">Métricas por região, país e gestor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-muted/50 p-1">
            {(['7d', '30d', '90d', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  timeRange === range ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {range === '7d' ? '7 dias' : range === '30d' ? '30 dias' : range === '90d' ? '90 dias' : 'Tudo'}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={loadAllMetrics}>
            <Download className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
          { id: 'comparison', label: 'Comparação', icon: Target },
          { id: 'performance', label: 'Desempenho', icon: Zap },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setViewMode(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              viewMode === id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* Global Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard
          icon={<Layers className="h-5 w-5" />} label="Regiões"
          value={globalMetrics.activeRegions} color="text-blue-500" bg="bg-blue-500/10"
        />
        <MetricCard
          icon={<MapPin className="h-5 w-5" />} label="Países"
          value={globalMetrics.activeCountries} color="text-emerald-500" bg="bg-emerald-500/10"
        />
        <MetricCard
          icon={<Users className="h-5 w-5" />} label="Utilizadores"
          value={formatNumber(globalMetrics.totalUsers)} color="text-violet-500" bg="bg-violet-500/10"
        />
        <MetricCard
          icon={<DollarSign className="h-5 w-5" />} label="Receita"
          value={formatCurrency(globalMetrics.totalRevenue)} color="text-gold" bg="bg-amber-500/10"
        />
        <MetricCard
          icon={<Stethoscope className="h-5 w-5" />} label="Médicos"
          value={formatNumber(globalMetrics.totalDoctors)} color="text-teal-500" bg="bg-teal-500/10"
        />
        <MetricCard
          icon={<ShoppingCart className="h-5 w-5" />} label="Encomendas"
          value={formatNumber(globalMetrics.totalTransactions)} color="text-rose-500" bg="bg-rose-500/10"
        />
      </div>

      {/* Mini Chart Area */}
      <div className="bento-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm">Actividade Semanal (Encomendas)</h3>
          <Badge variant="secondary" className="text-xs">Últimos 7 dias</Badge>
        </div>
        <div className="flex items-end gap-1.5 h-32">
          {weeklyActivity.length > 0 ? weeklyActivity.map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-primary to-primary/60 transition-all hover:from-primary hover:to-primary/80 min-h-[8px]"
                style={{ height: `${(val / maxWeekly) * 100}%` }}
              />
              <span className="text-[9px] text-muted-foreground font-medium">{weekDays[i].split(' ')[0]}</span>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground w-full text-center py-8">Sem dados disponíveis</p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">A carregar métricas regionais...</p>
        </div>
      ) : (
        <>
          {viewMode === 'overview' && (
            <>
              {/* Region Cards Grid */}
              <div>
                <h2 className="mb-3 text-lg font-bold">Regiões — {regionData.length} activas</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {regionData.map((region) => {
                    const metrics = aggregateRegionMetrics(countryMetrics, region.items);
                    return (
                      <button
                        key={region.id}
                        onClick={() => {
                          setSelectedRegionId(selectedRegionId === region.id ? null : region.id);
                          setSelectedCountryId(null);
                        }}
                        className={`bento-card group flex flex-col items-start gap-2 p-4 text-left transition-all hover:scale-[1.02] ${
                          selectedRegionId === region.id ? "ring-2 ring-primary shadow-lg" : ""
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="text-2xl">{region.emoji}</span>
                          {metrics.growthPositive ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <span className="font-bold leading-tight">{region.label}</span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-xs">
                            {region.items.length} {region.items.length === 1 ? "país" : "países"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 w-full">
                          <div>
                            <p className="text-xs text-muted-foreground">Utilizadores</p>
                            <p className="text-sm font-bold">{metrics.totalUsersFormatted}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Receita</p>
                            <p className="text-sm font-bold">{metrics.totalRevenueFormatted}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Médicos</p>
                            <p className="text-sm font-bold">{metrics.doctors}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Crescimento</p>
                            <p className={`text-sm font-bold ${metrics.growthPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                              {metrics.growthPositive ? '+' : ''}{metrics.growth}%
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Region Detail */}
              {selectedRegion && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{selectedRegion.emoji}</span>
                      <div>
                        <h2 className="text-xl font-black">{selectedRegion.label}</h2>
                        <p className="text-sm text-muted-foreground">
                          {selectedRegion.items.length} países · {selectedRegion.items.reduce((s, c) => s + (c.config?.cities?.length || 0), 0)} cidades
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { setSelectedRegionId(null); setSelectedCountryId(null); }}>
                      Fechar
                    </Button>
                  </div>

                  {/* Region Quick Stats */}
                  {(() => {
                    const rm = aggregateRegionMetrics(countryMetrics, selectedRegion.items);
                    return (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <QuickStat icon={<UserCheck className="h-4 w-4" />} label="Gestores" value={String(rm.regionalManagers)} />
                        <QuickStat icon={<Activity className="h-4 w-4" />} label="Verificações Pend." value={String(rm.pendingVerifications)} />
                        <QuickStat icon={<StarIcon className="h-4 w-4" />} label="Ticket Médio" value={String(rm.avgOrderValue)} />
                        <QuickStat icon={<Clock className="h-4 w-4" />} label="Encomendas" value={String(rm.orders)} />
                      </div>
                    );
                  })()}

                  {/* Countries in region */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedRegion.items.map((country) => {
                      const cm = countryMetrics[country.id] || { users: 0, activeUsers: 0, revenue: 0, orders: 0, doctors: 0, pharmacies: 0, institutions: 0, growth: 0, avgRating: 0, pendingVerifications: 0, regionalManagers: 0, churnRate: 0, avgOrderValue: 0 };
                      const isSelected = selectedCountryId === country.id;
                      return (
                        <button
                          key={country.id}
                          onClick={() => setSelectedCountryId(isSelected ? null : country.id)}
                          className={`bento-card flex flex-col gap-3 p-5 text-left transition-all hover:scale-[1.01] ${
                            isSelected ? "ring-2 ring-primary shadow-lg" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{isoToFlag(country.id)}</span>
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate font-bold leading-tight">{country.name}</h3>
                              <p className="text-xs text-muted-foreground">{country.id} · {country.currency_code}</p>
                            </div>
                            <Badge variant="outline" className="shrink-0 font-mono text-xs">{country.currency_symbol}</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <MiniStat icon={<Users className="h-3.5 w-3.5" />} value={formatNumber(cm.users)} label="Utilizadores" />
                            <MiniStat icon={<Stethoscope className="h-3.5 w-3.5" />} value={String(cm.doctors)} label="Médicos" />
                            <MiniStat icon={<ShoppingCart className="h-3.5 w-3.5" />} value={formatNumber(cm.orders)} label="Encomendas" />
                          </div>
                          <div className="flex items-center justify-between border-t border-border/50 pt-3">
                            <div className={`flex items-center gap-1 text-xs font-semibold ${cm.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {cm.growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {cm.growth >= 0 ? '+' : ''}{cm.growth}%
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <CreditCard className="h-3 w-3" />
                              <span>{country.config?.payment_methods?.length || 0} métodos</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Country Detail Panel */}
              {selectedRegion && selectedCountry && (
                <CountryDetailPanel country={selectedCountry} metrics={countryMetrics[selectedCountry.id]} onClose={() => setSelectedCountryId(null)} />
              )}
            </>
          )}

          {viewMode === 'comparison' && (
            <ComparisonView regionData={regionData} countryMetrics={countryMetrics} />
          )}

          {viewMode === 'performance' && (
            <PerformanceView regionData={regionData} countryMetrics={countryMetrics} />
          )}
        </>
      )}
    </div>
  );
}

// ====== SUB-COMPONENTS ======

function MetricCard({ icon, label, value, color, bg, trend, trendUp }: {
  icon: React.ReactNode; label: string; value: string | number; color: string; bg: string; trend?: string; trendUp?: boolean;
}) {
  return (
    <div className="bento-card flex flex-col gap-2 p-4">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg}`}>
        <span className={color}>{icon}</span>
      </div>
      <p className="text-xl font-black leading-none">{value}</p>
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        {trend && (
          <span className={`text-[10px] font-semibold ${trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

function QuickStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bento-card flex items-center gap-2 p-3">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <p className="text-sm font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl bg-muted/50 px-2 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm font-black leading-none">{value}</span>
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </div>
  );
}

function CountryDetailPanel({ country, metrics, onClose }: { country: Country; metrics?: CountryMetrics; onClose: () => void }) {
  const cm = metrics || { users: 0, activeUsers: 0, revenue: 0, orders: 0, doctors: 0, pharmacies: 0, institutions: 0, growth: 0, avgRating: 0, pendingVerifications: 0, regionalManagers: 0, churnRate: 0, avgOrderValue: 0 };
  return (
    <div className="bento-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{isoToFlag(country.id)}</span>
          <div>
            <h3 className="font-black text-lg">{country.name}</h3>
            <p className="text-xs text-muted-foreground">{country.id} · {country.currency_code} ({country.currency_symbol})</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <DetailStat icon={<Users className="h-4 w-4" />} label="Utilizadores" value={cm.users} />
        <DetailStat icon={<Users className="h-4 w-4" />} label="Utilizadores Activos" value={cm.activeUsers} />
        <DetailStat icon={<Stethoscope className="h-4 w-4" />} label="Médicos" value={cm.doctors} />
        <DetailStat icon={<Building2 className="h-4 w-4" />} label="Farmácias" value={cm.pharmacies} />
        <DetailStat icon={<Building2 className="h-4 w-4" />} label="Instituições" value={cm.institutions} />
        <DetailStat icon={<ShoppingCart className="h-4 w-4" />} label="Encomendas" value={cm.orders} />
        <DetailStat icon={<DollarSign className="h-4 w-4" />} label="Receita" value={cm.revenue} />
        <DetailStat icon={<MapPin className="h-4 w-4" />} label="Cidades" value={country.config?.cities?.length || 0} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-muted/50 p-3 text-center">
          <p className={`text-lg font-black ${cm.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {cm.growth >= 0 ? '+' : ''}{cm.growth}%
          </p>
          <p className="text-[10px] text-muted-foreground">Crescimento</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-3 text-center">
          <p className="text-lg font-black">{cm.avgOrderValue}</p>
          <p className="text-[10px] text-muted-foreground">Ticket Médio</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-3 text-center">
          <p className="text-lg font-black text-amber-500">{cm.pendingVerifications}</p>
          <p className="text-[10px] text-muted-foreground">Verificações Pend.</p>
        </div>
      </div>
      {/* Payment methods list */}
      {country.config?.payment_methods && country.config.payment_methods.length > 0 && (
        <div>
          <h4 className="text-sm font-bold mb-2">Métodos de Pagamento</h4>
          <div className="flex flex-wrap gap-1.5">
            {country.config.payment_methods.map((m: string) => (
              <Badge key={m} variant="secondary" className="text-xs gap-1">
                <CreditCard className="h-3 w-3" /> {m}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {/* Cities list */}
      {country.config?.cities && country.config.cities.length > 0 && (
        <div>
          <h4 className="text-sm font-bold mb-2">Cidades ({country.config.cities.length})</h4>
          <div className="flex flex-wrap gap-1.5">
            {country.config.cities.map((c: string) => (
              <Badge key={c} variant="outline" className="text-xs gap-1">
                <MapPin className="h-3 w-3" /> {c}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-3">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-bold truncate">{value.toLocaleString()}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function ComparisonView({ regionData, countryMetrics }: { regionData: ReturnType<typeof getCountriesByRegion>; countryMetrics: Record<string, CountryMetrics> }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Comparação entre Regiões</h2>
      <div className="bento-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left p-3 font-semibold text-muted-foreground">Região</th>
              <th className="text-right p-3 font-semibold text-muted-foreground">Países</th>
              <th className="text-right p-3 font-semibold text-muted-foreground">Utilizadores</th>
              <th className="text-right p-3 font-semibold text-muted-foreground">Médicos</th>
              <th className="text-right p-3 font-semibold text-muted-foreground">Receita</th>
              <th className="text-right p-3 font-semibold text-muted-foreground">Crescimento</th>
            </tr>
          </thead>
          <tbody>
            {regionData.map((region) => {
              const m = aggregateRegionMetrics(countryMetrics, region.items);
              return (
                <tr key={region.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-semibold">
                    <div className="flex items-center gap-2">
                      <span>{region.emoji}</span>
                      <span className="truncate">{region.label}</span>
                    </div>
                  </td>
                  <td className="text-right p-3">{region.items.length}</td>
                  <td className="text-right p-3 font-mono">{m.totalUsersFormatted}</td>
                  <td className="text-right p-3 font-mono">{m.doctors}</td>
                  <td className="text-right p-3 font-mono">{m.totalRevenueFormatted}</td>
                  <td className={`text-right p-3 font-mono font-semibold ${m.growthPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                    {m.growthPositive ? '+' : ''}{m.growth}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PerformanceView({ regionData, countryMetrics }: { regionData: ReturnType<typeof getCountriesByRegion>; countryMetrics: Record<string, CountryMetrics> }) {
  const leaderboard = useMemo(() => {
    return regionData.map(region => {
      const m = aggregateRegionMetrics(countryMetrics, region.items);
      return {
        regionId: region.id,
        label: region.label,
        emoji: region.emoji,
        countryCount: region.items.length,
        score: Math.round(
          (m.growth * 2) +
          (m.doctors / 10) +
          (m.users / 10000) +
          (m.regionalManagers * 15)
        ),
        growth: m.growth,
        avgRating: m.avgRating,
        managers: m.regionalManagers,
        pendingVerifications: m.pendingVerifications,
        churnRate: m.churnRate,
      };
    }).sort((a, b) => b.score - a.score);
  }, [regionData, countryMetrics]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Desempenho dos Gestores Regionais</h2>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bento-card p-4 text-center">
          <Target className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-xl font-black">{leaderboard.reduce((s, r) => s + r.managers, 0)}</p>
          <p className="text-[10px] text-muted-foreground">Gestores Activos</p>
        </div>
        <div className="bento-card p-4 text-center">
          <Eye className="h-5 w-5 mx-auto text-blue-500 mb-1" />
          <p className="text-xl font-black">{leaderboard.reduce((s, r) => s + r.pendingVerifications, 0)}</p>
          <p className="text-[10px] text-muted-foreground">Verificações Pendentes</p>
        </div>
        <div className="bento-card p-4 text-center">
          <TrendingUp className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-xl font-black">{leaderboard.length > 0 ? (leaderboard.reduce((s, r) => s + r.growth, 0) / leaderboard.length).toFixed(1) : 0}%</p>
          <p className="text-[10px] text-muted-foreground">Crescimento Médio</p>
        </div>
        <div className="bento-card p-4 text-center">
          <Zap className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-xl font-black">{leaderboard.length > 0 ? (leaderboard.reduce((s, r) => s + r.churnRate, 0) / leaderboard.length).toFixed(1) : 0}%</p>
          <p className="text-[10px] text-muted-foreground">Churn Médio</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="space-y-2">
        {leaderboard.map((entry, idx) => (
          <div key={entry.regionId} className="bento-card p-4 flex items-center gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-sm ${
              idx === 0 ? 'bg-amber-500/10 text-amber-500' :
              idx === 1 ? 'bg-gray-500/10 text-gray-500' :
              idx === 2 ? 'bg-orange-500/10 text-orange-500' :
              'bg-muted text-muted-foreground'
            }`}>
              #{idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{entry.emoji}</span>
                <h3 className="font-bold truncate">{entry.label}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{entry.countryCount} países · {entry.managers} gestores</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-black">{entry.score}</p>
              <p className="text-[10px] text-muted-foreground">Score</p>
            </div>
            <div className="hidden sm:flex flex-col gap-0.5 shrink-0">
              <div className={`text-xs font-semibold ${entry.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {entry.growth >= 0 ? '+' : ''}{entry.growth}%
              </div>
              <div className="text-xs text-muted-foreground">⭐ {entry.avgRating}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
