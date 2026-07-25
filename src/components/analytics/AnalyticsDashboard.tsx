/**
 * AnalyticsDashboard — Platform analytics with charts and KPIs
 * Uses recharts for visualizations
 */
import { motion } from 'framer-motion';
import { useCountry } from '@/contexts/CountryContext';
import { getTheme } from '@/themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import { Users, Wallet, Activity, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const userGrowthData = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  users: 80 + Math.floor(Math.random() * 40 + i * 3),
  active: 50 + Math.floor(Math.random() * 25 + i * 2),
}));

const funnelData = [
  { step: 'Registo', count: 1250, fill: '#009739' },
  { step: 'Verificação', count: 870, fill: '#FFD100' },
  { step: '1ª Consulta', count: 420, fill: '#D40000' },
  { step: 'Pagamento', count: 310, fill: '#0066CC' },
];

const provinceData = [
  { name: 'Maputo', value: 4200, fill: '#0077B6' },
  { name: 'Nampula', value: 1800, fill: '#8B5CF6' },
  { name: 'Zambézia', value: 1400, fill: '#059669' },
  { name: 'Sofala', value: 900, fill: '#DC2626' },
  { name: 'Inhambane', value: 700, fill: '#F59E0B' },
  { name: 'Outros', value: 1200, fill: '#6B7280' },
];

const paymentData = [
  { name: 'Sucesso', value: 87, fill: '#059669' },
  { name: 'Falhou', value: 8, fill: '#DC2626' },
  { name: 'Pendente', value: 5, fill: '#F59E0B' },
];

const topFeatures = [
  { name: 'Consultas', usage: 78 },
  { name: 'Farmácia', usage: 65 },
  { name: 'Carteira', usage: 54 },
  { name: 'Triagem IA', usage: 42 },
  { name: 'Receitas', usage: 38 },
  { name: 'Exames', usage: 25 },
];

const kpis = [
  { label: 'Utilizadores', value: 11200, trend: 12.5, up: true, icon: Users },
  { label: 'Carteiras Activas', value: 4350, trend: 8.3, up: true, icon: Wallet },
  { label: 'Consultas Hoje', value: 127, trend: -3.2, up: false, icon: Activity },
  { label: 'Receita MTD', value: 285000, trend: 15.7, up: true, icon: TrendingUp },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' },
  }),
};

export function AnalyticsDashboard({ className = '' }: { className?: string }) {
  const { country, t } = useCountry();
  const theme = getTheme(country?.id || 'MZ');

  const formatValue = (val: number) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toLocaleString();
  };

  const currency = country?.currency_symbol || 'MT';

  return (
    <div className={cn('w-full max-w-6xl mx-auto space-y-6', className)}>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label} custom={i} variants={cardVariants} initial="hidden" animate="visible">
              <Card className="overflow-hidden">
                <div className="h-1" style={{ background: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.secondary})` }} />
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${theme.colors.primary}15`, color: theme.colors.primary }}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className={cn(
                      'flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full',
                      kpi.up ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
                    )}>
                      {kpi.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {Math.abs(kpi.trend)}%
                    </div>
                  </div>
                  <p className="text-xl font-bold" style={{ color: theme.colors.text }}>
                    {kpi.label === 'Receita MTD' ? `${currency} ${formatValue(kpi.value)}` : formatValue(kpi.value)}
                  </p>
                  <p className="text-xs" style={{ color: theme.colors.textMuted }}>{kpi.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-3 gap-4">
        <motion.div variants={cardVariants} custom={4} initial="hidden" animate="visible" className="md:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                {t('analytics.user_growth')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={userGrowthData}>
                  <defs>
                    <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.colors.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={theme.colors.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke={theme.colors.textMuted} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} stroke={theme.colors.textMuted} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: `1px solid ${theme.colors.primary}30`, borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="users" stroke={theme.colors.primary} fill="url(#userGrad)" strokeWidth={2} name="Total" />
                  <Area type="monotone" dataKey="active" stroke={theme.colors.secondary} fill="none" strokeWidth={2} strokeDasharray="4 4" name="Activos" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} custom={5} initial="hidden" animate="visible">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                {t('analytics.funnel')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={funnelData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke={theme.colors.textMuted} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="step" tick={{ fontSize: 10 }} stroke={theme.colors.textMuted} tickLine={false} axisLine={false} width={70} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid md:grid-cols-3 gap-4">
        <motion.div variants={cardVariants} custom={6} initial="hidden" animate="visible">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                {t('analytics.regional_breakdown')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 flex justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={provinceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                    {provinceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} custom={7} initial="hidden" animate="visible">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                {t('analytics.payment_conversion')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 flex justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" startAngle={90} endAngle={-270}>
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} custom={8} initial="hidden" animate="visible">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                {t('analytics.top_features')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 space-y-2">
              {topFeatures.map((feat, i) => (
                <div key={feat.name} className="flex items-center gap-2">
                  <span className="text-xs w-20 truncate" style={{ color: theme.colors.text }}>{feat.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: theme.colors.primary }}
                      initial={{ width: 0 }}
                      animate={{ width: `${feat.usage}%` }}
                      transition={{ delay: 0.8 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right" style={{ color: theme.colors.textMuted }}>{feat.usage}%</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
