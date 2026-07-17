import { Meddy } from './Meddy';
import type { MeddyRole, MeddyState } from './Meddy';
import { MeddySpeechBubble } from './MeddySpeechBubble';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Props {
  role?: MeddyRole;
  state?: MeddyState;
  size?: number;
  title?: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
}

/**
 * MeddyEmptyState — usado em vez de mensagens de "no data".
 * Meddy aparece a olhar para o user com expressão contextual e sugere acções.
 */
export function MeddyEmptyState({
  role = 'patient',
  state = 'thinking',
  size = 80,
  title = "Hmm, ainda nada aqui.",
  message = "Estou a trabalhar para encher este espaço. Entretanto, posso sugerir-te alternativas.",
  actionLabel,
  actionHref,
}: Props) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center text-center py-4">
      <Meddy role={role} state={state} size={size} />
      <h3 className="text-base font-bold mt-2">{title}</h3>
      <div className="max-w-xs mt-2">
        <MeddySpeechBubble variant="speech">
          <p className="text-sm leading-relaxed">{message}</p>
        </MeddySpeechBubble>
      </div>
      {actionLabel && actionHref && (
        <Button size="sm" className="mt-3" onClick={() => navigate(actionHref)}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}