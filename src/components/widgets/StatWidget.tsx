import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  colorClass?: string;
  className?: string;
}

export function StatWidget({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  colorClass = 'text-primary',
  className 
}: StatWidgetProps) {
  return (
    <Card className={cn("hover:shadow-lg transition-all duration-300 group", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-sm font-medium",
                trend.isPositive ? "text-green-500" : "text-red-500"
              )}>
                <span>{trend.isPositive ? '↑' : '↓'}</span>
                <span>{Math.abs(trend.value)}%</span>
                <span className="text-muted-foreground text-xs">vs período anterior</span>
              </div>
            )}
          </div>
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
            "bg-gradient-to-br from-primary/10 to-primary/5"
          )}>
            <Icon className={cn("h-7 w-7", colorClass)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
