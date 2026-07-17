import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Activity, Clock } from 'lucide-react';

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'order' | 'product' | 'review' | 'system' | 'delivery';
  status?: string;
}

interface ActivityFeedWidgetProps {
  title?: string;
  activities: ActivityItem[];
  maxHeight?: number;
  className?: string;
  emptyMessage?: string;
}

const typeColors: Record<string, string> = {
  order: 'bg-food/10 text-food border-food/20',
  product: 'bg-grocery/10 text-grocery border-grocery/20',
  review: 'bg-primary/10 text-primary border-primary/20',
  system: 'bg-muted text-muted-foreground border-border',
  delivery: 'bg-pharmacy/10 text-pharmacy border-pharmacy/20'
};

export function ActivityFeedWidget({ 
  title = "Atividade Recente", 
  activities, 
  maxHeight = 400,
  className,
  emptyMessage = "Nenhuma atividade recente"
}: ActivityFeedWidgetProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <ScrollArea style={{ maxHeight }} className="pr-4">
            <div className="space-y-3">
              {activities.map((activity) => (
                <div 
                  key={activity.id}
                  className="flex gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border",
                    typeColors[activity.type]
                  )}>
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate">{activity.title}</p>
                      {activity.status && (
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {activity.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
