import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Trophy, TrendingUp } from 'lucide-react';

interface TopItem {
  id: string;
  name: string;
  value: number | string;
  subtitle?: string;
  image?: string;
  change?: number;
}

interface TopItemsWidgetProps {
  title: string;
  items: TopItem[];
  valueLabel?: string;
  showRanking?: boolean;
  className?: string;
}

export function TopItemsWidget({ 
  title, 
  items, 
  valueLabel = '',
  showRanking = true,
  className 
}: TopItemsWidgetProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">Sem dados disponíveis</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div 
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                  "hover:bg-muted/50",
                  index === 0 && "bg-primary/5 border border-primary/20"
                )}
              >
                {showRanking && (
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                    index === 0 && "bg-yellow-500 text-white",
                    index === 1 && "bg-gray-400 text-white",
                    index === 2 && "bg-amber-600 text-white",
                    index > 2 && "bg-muted text-muted-foreground"
                  )}>
                    {index + 1}
                  </div>
                )}
                
                {item.image && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  {item.subtitle && (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.subtitle}
                    </p>
                  )}
                </div>
                
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm">
                    {item.value} {valueLabel}
                  </p>
                  {item.change !== undefined && (
                    <div className={cn(
                      "flex items-center justify-end gap-1 text-xs",
                      item.change >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      <TrendingUp className={cn(
                        "h-3 w-3",
                        item.change < 0 && "rotate-180"
                      )} />
                      <span>{Math.abs(item.change)}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
