import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  consultationId: string;
  doctorId: string;
  doctorName?: string;
  onSuccess?: () => void;
}

export function PostConsultationReview({ open, onOpenChange, consultationId, doctorId, doctorName, onSuccess }: Props) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user || rating === 0) { toast.error('Escolhe uma avaliação'); return; }
    setLoading(true);
    const { error } = await supabase.from('doctor_reviews').upsert({
      consultation_id: consultationId,
      doctor_id: doctorId,
      patient_id: user.id,
      rating,
      comment: comment.trim() || null,
    }, { onConflict: 'consultation_id' });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Obrigado pela tua avaliação!');
    onOpenChange(false);
    onSuccess?.();
  };

  const display = hover || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Avaliar Dr(a). {doctorName || 'médico'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="flex justify-center gap-2">
            {[1,2,3,4,5].map(n => (
              <button key={n} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)}>
                <Star className={cn('h-9 w-9 transition', n <= display ? 'fill-gold text-gold' : 'text-muted-foreground')} />
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {display === 1 && 'Muito insatisfeito'}
            {display === 2 && 'Insatisfeito'}
            {display === 3 && 'Razoável'}
            {display === 4 && 'Bom atendimento'}
            {display === 5 && 'Excelente!'}
          </p>
          <Textarea placeholder="Conta como foi a consulta (opcional)" value={comment} onChange={e => setComment(e.target.value)} rows={3} />
          <Button onClick={submit} disabled={loading || rating === 0} className="w-full">
            {loading ? 'A enviar...' : 'Enviar avaliação'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}