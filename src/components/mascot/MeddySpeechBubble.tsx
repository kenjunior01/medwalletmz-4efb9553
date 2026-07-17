import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  variant?: 'default' | 'soft' | 'speech';
  className?: string;
}

/**
 * MeddySpeechBubble — balão de fala com o estilo Meddy.
 *  - default : fundo branco, sombra leve
 *  - soft    : fundo bege, sem sombra
 *  - speech   : com "cauda" apontando para baixo-esquerda (onde Meddy está)
 */
export function MeddySpeechBubble({ children, variant = 'default', className }: Props) {
  return (
    <div className={cn("relative inline-block max-w-full", className)}>
      <div
        className={cn(
          "rounded-2xl px-3 py-2 text-foreground text-sm leading-relaxed",
          variant === 'default' && "bg-card border border-border shadow-sm",
          variant === 'soft' && "bg-amber-50/80 dark:bg-amber-950/30",
          variant === 'speech' && "bg-card border border-border shadow-md",
        )}
      >
        {children}
      </div>
      {variant === 'speech' && (
        <div className="absolute -bottom-2 left-4 w-4 h-4 bg-card border-r border-b border-border rotate-45" />
      )}
    </div>
  );
}