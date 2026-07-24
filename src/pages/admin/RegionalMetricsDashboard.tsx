import { useState, useMemo } from 'react';
import {
  Globe, MapPin, Users, Building2, TrendingUp, TrendingDown, CreditCard,
  ChevronDown, ChevronUp, Layers, DollarSign, UserCheck, ShoppingCart,
  Stethoscope, Activity, BarChart3, Eye, Download, Filter, ArrowUpRight,
  ArrowDownRight, Target, Zap, Clock
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { REGIONS, getCountriesByRegion, useCountry } from "@/contexts/CountryContext";
import type { Country } from "@/contexts/CountryContext";

// ====== MOCK DATA GENERATORS (will be replaced by real Supabase queries) ======

function generateRegionMetrics(regionId: string, countryCount: number) {
  const base = {
    totalUsers: Math.floor(Math.random() * 50000) + 2000 * countryCount,
    totalTransactions: Math.floor(Math.random() * 100000) + 5000 * countryCount,
    totalRevenue: Math.floor(Math.random() * 5000000) + 100000 * countryCount,
    activeDoctors: Math.floor(Math.random() * 500) + 50 * countryCount,
    activePharmacies: Math.floor(Math.random() * 300) + 30 * countryCount,
    activeInstitutions: Math.floor(Math.random() * 200) + 20 * countryCount,
    totalOrders: Math.floor(Math.random() * 80000) + 3000 * countryCount,
    pendingVerifications: Math.floor(Math.random() * 50) + 5,
    regionalManagers: Math.floor(Math.random() * 10) + 1,
    avgRating: (Math.random() * 1.5 + 3.5).toFixed(1),
    growthRate: (Math.random() * 20 - 5).toFixed(1),
    avgOrderValue: Math.floor(Math.random() * 500) + 50,
    churnRate: (Math.random() * 10 + 2).toFixed(1),
  };

  return {
    ...base,
    totalUsersFormatted: formatNumber(base.totalUsers),
    totalRevenueFormatted: formatCurrency(base.totalRevenue),
    growthPositive: Number(base.growthRate) >= 0,
    topCountry: `Country_${regionId}`,
  };
}

function generateCountryMetrics(country: Country) {
  return {
    users: Math.floor(Math.random() * 20000) + 1000,
    revenue: Math.floor(Math.random() * 1000000) + 50000,
    orders: Math.floor(Math.random() * 20000) + 500,
    doctors: Math.floor(Math.random() * 200) + 10,
    pharmacies: Math.floor(Math.random() * 100) + 5,
    institutions: Math.floor(Math.random() * 80) + 3,
    growth: (Math.random() * 25 - 3).toFixed(1),
    avgRating: (Math.random() * 1.5 + 3.5).toFixed(1),
    pendingVerifications: Math.floor(Math.random() * 15) + 1,
    activeUsers: Math.floor(Math.random() * 15000) + 500,
    paymentMethods: country.config?.payment_methods?.length || 0,
    cities: country.config?.cities?.length || 0,
  };
}

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

// ====== MAIN COMPONENT ======

export default function RegionalMetricsDashboard() {
  const { allCountries } = useCountry();
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [viewMode, setViewMode] = useState<'overview' | 'comparison' | 'performance'>('overview');

  const regionData = useMemo(() => getCountriesByRegion(allCountries), [allCountries]);
  const selectedRegion = regionData.find((r) => r.id === selectedRegionId) ?? null;
  const selectedCountry = selectedRegion?.items.find(c => c.id === selectedCountryId) ?? null;
  const totalCountries = allCountries.length;
  const totalCities = allCountries.reduce((sum, c) => sum + (c.config?.cities?.length || 0), 0);

  // Aggregate global metrics
  const globalMetrics = useMemo(() => ({
    totalUsers: allCountries.reduce((sum, _) => sum + Math.floor(Math.random() * 5000) + 1000, 0),
    totalRevenue: allCountries.reduce((sum, _) => sum + Math.floor(Math.random() * 500000) + 50000, 0),
    totalTransactions: allCountries.reduce((sum, _) => sum + Math.floor(Math.random() * 20000) + 2000, 0),
    totalDoctors: allCountries.reduce((sum, _) => sum + Math.floor(Math.random() * 200) + 20, 0),
    totalPharmacies: allCountries.reduce((sum, _) => sum + Math.floor(Math.random() * 100) + 10, 0),
    activeCountries: totalCountries,
    activeRegions: regionData.length,
  }), [allCountries, totalCountries, regionData.length]);

  const weekDays = getLast7Days();
  const miniChartData = useMemo(() => weekDays.map(() => Math.floor(Math.random() * 100) + 20), [weekDays]);

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
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Exportar
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
          trend={"+2.1%"} trendUp={true}
        />
        <MetricCard
          icon={<MapPin className="h-5 w-5" />} label="Países"
          value={globalMetrics.activeCountries} color="text-emerald-500" bg="bg-emerald-500/10"
          trend={"+3" trendUp={true}
        />
        <MetricCard
          icon={<Users className="h-5 w-5" />} label="Utilizadores"
          value={formatNumber(globalMetrics.totalUsers)} color="text-violet-500" bg="bg-violet-500/10"
          trend="+12.4%" trendUp={true}
        />
        <MetricCard
          icon={<DollarSign className="h-5 w-5" />} label="Receita"
          value={formatCurrency(globalMetrics.totalRevenue)} color="text-gold" bg="bg-amber-500/10"
          trend="+8.7%" trendUp={true}
        />
        <MetricCard
          icon={<Stethoscope className="h-5 w-5" />} label="Médicos"
          value={formatNumber(globalMetrics.totalDoctors)} color="text-teal-500" bg="bg-teal-500/10"
          trend="+5.2%" trendUp={true}
        />
        <MetricCard
          icon={<ShoppingCart className="h-5 w-5" />} label="Encomendas"
          value={formatNumber(globalMetrics.totalTransactions)} color="text-rose-500" bg="bg-rose-500/10"
          trend="+15.3%" trendUp={true}
        />
      </div>

      {/* Mini Chart Area */}
      <div className="bento-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm">Actividade Semanal</h3>
          <Badge variant="secondary" className="text-xs">Últimos 7 dias</Badge>
        </div>
        <div className="flex items-end gap-1.5 h-32">
          {miniChartData.map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-primary to-primary/60 transition-all hover:from-primary hover:to-primary/80 min-h-[8px]"
                style={{ height: `${(val / 120) * 100}%` }}
              />
              <span className="text-[9px] text-muted-foreground font-medium">{weekDays[i].split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {viewMode === 'overview' && (
        <>
          {/* Region Cards Grid */}
          <div>
            <h2 className="mb-3 text-lg font-bold">Regiões — {regionData.length} activas</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {regionData.map((region) => {
                const metrics = generateRegionMetrics(region.id, region.items.length);
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
                      {Number(metrics.growthRate) >= 0 ? (
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
                        <p className="text-sm font-bold">{metrics.activeDoctors}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Crescimento</p>
                        <p className={`text-sm font-bold ${metrics.growthPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                          {metrics.growthPositive ? '+' : ''}{metrics.growthRate}%
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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <QuickStat icon={<UserCheck className="h-4 w-4" />} label="Gestores" value={String(generateRegionMetrics(selectedRegion.id, 1).regionalManagers)} />
                <QuickStat icon={<Activity className="h-4 w-4" />} label="Verificações Pend." value={String(generateRegionMetrics(selectedRegion.id, 1).pendingVerifications)} />
                <QuickStat icon={<Star className="h-4 w-4" />} label="Avaliação Média" value={`${generateRegionMetrics(selectedRegion.id, 1).avgRating}/5`} />
                <QuickStat icon={<Clock className="h-4 w-4" />} label="Ticket Médio" value={String(generateRegionMetrics(selectedRegion.id, 1).avgOrderValue)} />
              </div>

              {/* Countries in region */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {selectedRegion.items.map((country) => {
                  const cm = generateCountryMetrics(country);
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
                        <div className={`flex items-center gap-1 text-xs font-semibold ${Number(cm.growth) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {Number(cm.growth) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {Number(cm.growth) >= 0 ? '+' : ''}{cm.growth}%
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3 w-3" />
                          <span>{cm.avgRating}/5</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CreditCard className="h-3 w-3" />
                          <span>{cm.paymentMethods} métodos</span>
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
            <CountryDetailPanel country={selectedCountry} onClose={() => setSelectedCountryId(null)} />
          )}
        </>
      )}

      {viewMode === 'comparison' && (
        <ComparisonView regionData={regionData} />
      )}

      {viewMode === 'performance' && (
        <PerformanceView regionData={regionData} />
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

function CountryDetailPanel({ country, onClose }: { country: Country; onClose: () => void }) {
  const cm = generateCountryMetrics(country);
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
        <DetailStat icon={<CreditCard className="h-4 w-4" />} label="Métodos Pag." value={cm.paymentMethods} />
        <DetailStat icon={<MapPin className="h-4 w-4" />} label="Cidades" value={cm.cities} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-muted/50 p-3 text-center">
          <p className={`text-lg font-black ${Number(cm.growth) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {Number(cm.growth) >= 0 ? '+' : ''}{cm.growth}%
          </p>
          <p className="text-[10px] text-muted-foreground">Crescimento</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-3 text-center">
          <p className="text-lg font-black">{cm.avgRating}/5</p>
          <p className="text-[10px] text-muted-foreground">Avaliação</p>
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

function ComparisonView({ regionData }: { regionData: ReturnType<typeof getCountriesByRegion> }) {
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
              const m = generateRegionMetrics(region.id, region.items.length);
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
                  <td className="text-right p-3 font-mono">{m.activeDoctors}</td>
                  <td className="text-right p-3 font-mono">{m.totalRevenueFormatted}</td>
                  <td className={`text-right p-3 font-mono font-semibold ${m.growthPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                    {m.growthPositive ? '+' : ''}{m.growthRate}%
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

function PerformanceView({ regionData }: { regionData: ReturnType<typeof getCountriesByRegion> }) {
  // Performance leaderboard
  const leaderboard = useMemo(() => {
    return regionData.map(region => {
      const m = generateRegionMetrics(region.id, region.items.length);
      return {
        regionId: region.id,
        label: region.label,
        emoji: region.emoji,
        countryCount: region.items.length,
        score: Math.round(
          (Number(m.growthRate) * 2) +
          (m.activeDoctors / 10) +
          (m.totalUsers / 10000) +
          (Number(m.avgRating) * 10)
        ),
        growth: Number(m.growthRate),
        avgRating: Number(m.avgRating),
        managers: m.regionalManagers,
        pendingVerifications: m.pendingVerifications,
        churnRate: Number(m.churnRate),
      };
    }).sort((a, b) => b.score - a.score);
  }, [regionData]);

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
          <p className="text-xl font-black">{(leaderboard.reduce((s, r) => s + r.growth, 0) / leaderboard.length).toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground">Crescimento Médio</p>
        </div>
        <div className="bento-card p-4 text-center">
          <Zap className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-xl font-black">{(leaderboard.reduce((s, r) => s + r.churnRate, 0) / leaderboard.length).toFixed(1)}%</p>
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

function Star({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
