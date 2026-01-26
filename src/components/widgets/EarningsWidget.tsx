import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Wallet, TrendingUp, DollarSign, Calendar } from 'lucide-react';

interface EarningsData {
  today: number;
  week: number;
  month: number;
  pending?: number;
}

interface EarningsWidgetProps {
  earnings: EarningsData;
  currency?: string;
  showTrend?: boolean;
  trend?: number;
  className?: string;
}

export function EarningsWidget({ 
  earnings, 
  currency = 'MZN',
  showTrend = true,
  trend = 12,
  className 
}: EarningsWidgetProps) {
  return (
    <Card className={cn("bg-gradient-to-br from-primary/10 to-primary/5", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Ganhos
          </CardTitle>
          {showTrend && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{trend}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Today's earnings - Highlighted */}
          <div className="p-4 bg-card rounded-xl border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hoje</p>
                  <p className="text-2xl font-bold">
                    {earnings.today.toLocaleString()} {currency}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Other periods */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-card/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Esta Semana</span>
              </div>
              <p className="text-lg font-bold">
                {earnings.week.toLocaleString()} {currency}
              </p>
            </div>
            <div className="p-3 bg-card/50 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Este Mês</span>
              </div>
              <p className="text-lg font-bold">
                {earnings.month.toLocaleString()} {currency}
              </p>
            </div>
          </div>

          {/* Pending earnings */}
          {earnings.pending !== undefined && earnings.pending > 0 && (
            <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pendente</p>
                  <p className="text-lg font-bold text-yellow-600">
                    {earnings.pending.toLocaleString()} {currency}
                  </p>
                </div>
                <Badge variant="outline" className="border-yellow-500/50 text-yellow-600">
                  Aguardando
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

