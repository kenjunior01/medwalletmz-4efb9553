import { GlassCard } from '@/components/ui/design-system';
import {
  Package,
  TrendingUp,
  Clock,
  Star,
} from '@/components/icons/lucide-compat';
import type { TodayStats } from './types';

interface StatsGridProps {
  isOnline: boolean;
  stats: TodayStats;
}

export function StatsGrid({ isOnline, stats }: StatsGridProps) {
  const cardCls = isOnline ? 'bg-zinc-900/80 border-white/5' : '';
  const valueCls = isOnline ? 'text-white' : 'text-foreground';
  const labelCls = isOnline ? 'text-white/50' : 'text-muted-foreground';

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Entregas hoje */}
      <GlassCard className={`border ${cardCls}`}>
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`p-1.5 rounded-lg ${
              isOnline ? 'bg-blue-500/15' : 'bg-blue-50'
            }`}
          >
            <Package
              className={`w-4 h-4 ${
                isOnline ? 'text-blue-400' : 'text-blue-600'
              }`}
            />
          </div>
        </div>
        <p className={`text-2xl font-bold tabular-nums ${valueCls}`}>
          {stats.deliveries}
        </p>
        <p className={`text-xs mt-0.5 ${labelCls}`}>
          Entregas hoje
        </p>
      </GlassCard>

      {/* Ganho hoje */}
      <GlassCard className={`border ${cardCls}`}>
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`p-1.5 rounded-lg ${
              isOnline ? 'bg-emerald-500/15' : 'bg-emerald-50'
            }`}
          >
            <TrendingUp
              className={`w-4 h-4 ${
                isOnline ? 'text-emerald-400' : 'text-emerald-600'
              }`}
            />
          </div>
        </div>
        <p className={`text-2xl font-bold tabular-nums ${valueCls}`}>
          {stats.earnings}
        </p>
        <p className={`text-xs mt-0.5 ${labelCls}`}>
          Ganho hoje (MZN)
        </p>
      </GlassCard>

      {/* Tempo online */}
      <GlassCard className={`border ${cardCls}`}>
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`p-1.5 rounded-lg ${
              isOnline ? 'bg-purple-500/15' : 'bg-purple-50'
            }`}
          >
            <Clock
              className={`w-4 h-4 ${
                isOnline ? 'text-purple-400' : 'text-purple-600'
              }`}
            />
          </div>
        </div>
        <p className={`text-2xl font-bold tabular-nums ${valueCls}`}>
          {stats.onlineMinutes}m
        </p>
        <p className={`text-xs mt-0.5 ${labelCls}`}>
          Tempo online
        </p>
      </GlassCard>

      {/* Rating */}
      <GlassCard className={`border ${cardCls}`}>
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`p-1.5 rounded-lg ${
              isOnline ? 'bg-amber-500/15' : 'bg-amber-50'
            }`}
          >
            <Star
              className={`w-4 h-4 ${
                isOnline ? 'text-amber-400' : 'text-amber-500'
              }`}
            />
          </div>
        </div>
        <p className={`text-2xl font-bold tabular-nums ${valueCls}`}>
          {stats.rating.toFixed(1)}
        </p>
        <p className={`text-xs mt-0.5 ${labelCls}`}>
          Rating
        </p>
      </GlassCard>
    </div>
  );
}
