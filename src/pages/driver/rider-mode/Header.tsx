import { Badge } from '@/components/ui/badge';
import {
  Bell,
  Settings,
  ArrowRight,
} from '@/components/icons/lucide-compat';

interface HeaderProps {
  isOnline: boolean;
  onBack: () => void;
}

export function Header({ isOnline, onBack }: HeaderProps) {
  return (
    <header
      className={`relative z-20 flex items-center justify-between px-4 py-3 ${
        isOnline
          ? 'bg-zinc-950/80 backdrop-blur-md border-b border-white/5'
          : 'bg-background/80 backdrop-blur-md border-b border-border'
      }`}
    >
      <button
        onClick={onBack}
        className={`p-2 rounded-xl transition-colors ${
          isOnline
            ? 'hover:bg-white/10 active:bg-white/15'
            : 'hover:bg-accent active:bg-accent/80'
        }`}
        aria-label="Voltar"
      >
        <span className="rotate-180 inline-block">
          <ArrowRight className="w-5 h-5" />
        </span>
      </button>

      <div className="flex items-center gap-2">
        <Badge
          variant={isOnline ? 'default' : 'secondary'}
          className={
            isOnline
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs'
              : 'text-xs'
          }
        >
          {isOnline ? (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          ) : (
            'OFFLINE'
          )}
        </Badge>
      </div>

      <div className="flex items-center gap-1">
        <button
          className={`p-2 rounded-xl transition-colors ${
            isOnline
              ? 'hover:bg-white/10 text-white/70'
              : 'hover:bg-accent text-muted-foreground'
          }`}
          aria-label="Notificacoes"
        >
          <Bell className="w-5 h-5" />
        </button>
        <button
          className={`p-2 rounded-xl transition-colors ${
            isOnline
              ? 'hover:bg-white/10 text-white/70'
              : 'hover:bg-accent text-muted-foreground'
          }`}
          aria-label="Configuracoes"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
