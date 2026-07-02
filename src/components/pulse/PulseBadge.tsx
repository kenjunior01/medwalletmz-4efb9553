import { usePulseIdentity } from "@/hooks/usePulseIdentity";
import NumberFlow from "@number-flow/react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  className?: string;
  compact?: boolean;
}

/**
 * Badge unificado do sistema Pulse — adapta label/ícone/cor ao role.
 * Substitui o antigo "Joy Coins" na UI. A tabela `joy_coin_transactions`
 * continua a ser a fonte de dados; só muda a apresentação.
 */
export function PulseBadge({ value, className, compact }: Props) {
  const id = usePulseIdentity();
  const Icon = id.icon;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        "bg-gradient-to-br from-background/60 to-background/20 backdrop-blur",
        `border border-${id.accent}/30`,
        className,
      )}
    >
      <Icon className={`h-3.5 w-3.5 text-${id.accent}`} />
      <NumberFlow value={value} className="text-xs font-black tabular-nums" />
      {!compact && (
        <span className="text-[10px] font-semibold text-muted-foreground">
          {id.label}
        </span>
      )}
    </div>
  );
}