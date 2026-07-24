import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type EntityType = 'clinic' | 'hospital' | 'pharmacy' | 'laboratory' | 'veterinary' | 'store';

interface Props {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function RateInstitutionDialog({ entityType, entityId, entityName, trigger, onSuccess }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user) { toast.error('Inicia sessão para avaliar'); return; }
    if (rating === 0) { toast.error('Escolhe uma pontuação'); return; }
    setLoading(true);
    const { error } = await (supabase as any).from('institution_reviews').upsert({
      entity_type: entityType,
      entity_id: entityId,
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
    }, { onConflict: 'user_id,entity_type,entity_id' });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Obrigado pela avaliação!');
    setOpen(false);
    setRating(0);
    setComment('');
    onSuccess?.();
  };

  const display = hover || rating;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm" variant="outline" className="gap-1"><Star className="h-4 w-4" /> Avaliar</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Avaliar {entityName}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex justify-center gap-2">
            {[1,2,3,4,5].map(n => (
              <button key={n} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)}>
                <Star className={cn('h-9 w-9 transition', n <= display ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground')} />
              </button>
            ))}
          </div>
          <Textarea placeholder="Partilha a tua experiência (opcional)" value={comment} onChange={e => setComment(e.target.value)} rows={3} />
          <Button onClick={submit} className="w-full" disabled={loading || rating === 0}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Enviar avaliação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}