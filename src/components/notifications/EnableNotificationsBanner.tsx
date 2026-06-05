import { useNotifications } from '@/hooks/useNotifications';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { useState } from 'react';

export function EnableNotificationsBanner() {
  const { permission, request } = useNotifications();
  const [dismissed, setDismissed] = useState(
    typeof window !== 'undefined' && localStorage.getItem('notif-banner-dismissed') === '1'
  );

  if (permission === 'granted' || permission === 'denied' || dismissed) return null;

  return (
    <div className="px-4">
      <Card className="p-3 flex items-center gap-3 bg-primary/5 border-primary/20">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Ativar notificações</p>
          <p className="text-xs text-muted-foreground">Receba alertas de consultas, receitas e entregas.</p>
        </div>
        <Button size="sm" onClick={request}>Ativar</Button>
        <button
          onClick={() => { localStorage.setItem('notif-banner-dismissed', '1'); setDismissed(true); }}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </Card>
    </div>
  );
}