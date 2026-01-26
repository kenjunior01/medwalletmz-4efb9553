import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface QuickAction {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick: () => void;
  colorClass?: string;
  bgClass?: string;
}

interface QuickActionWidgetProps {
  title: string;
  actions: QuickAction[];
  className?: string;
}

export function QuickActionWidget({ title, actions, className }: QuickActionWidgetProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <h3 className="font-semibold mb-4">{title}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl",
                "border border-border bg-card hover:bg-muted/50",
                "transition-all duration-200 hover:scale-[1.02] hover:shadow-md",
                "group"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                action.bgClass || "bg-primary/10"
              )}>
                <action.icon className={cn("h-6 w-6", action.colorClass || "text-primary")} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium group-hover:text-primary transition-colors">
                  {action.label}
                </p>
                {action.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {action.description}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
