import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  storeId: string;
  storeName: string;
  onSuccess?: () => void;
}

export function ReviewModal({ 
  open, 
  onOpenChange, 
  orderId, 
  storeId, 
  storeName,
  onSuccess 
}: ReviewModalProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    if (rating === 0) {
      toast.error('Selecione uma avaliação');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          store_id: storeId,
          order_id: orderId,
          rating,
          comment: comment.trim() || null
        });

      if (error) throw error;

      // Update store rating average
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('store_id', storeId);

      if (reviews && reviews.length > 0) {
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        await supabase
          .from('stores')
          .update({ rating: avgRating })
          .eq('id', storeId);
      }

      toast.success('Avaliação enviada com sucesso!');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      toast.error('Erro ao enviar avaliação');
    } finally {
      setLoading(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Avaliar {storeName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none transition-transform hover:scale-110"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={cn(
                    "h-10 w-10 transition-colors",
                    star <= displayRating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  )}
                />
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {displayRating === 1 && 'Muito ruim'}
            {displayRating === 2 && 'Ruim'}
            {displayRating === 3 && 'Regular'}
            {displayRating === 4 && 'Bom'}
            {displayRating === 5 && 'Excelente!'}
          </p>

          {/* Comment */}
          <div className="space-y-2">
            <Textarea
              placeholder="Deixe um comentário (opcional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          {/* Submit */}
          <Button 
            onClick={handleSubmit} 
            className="w-full" 
            disabled={loading || rating === 0}
          >
            {loading ? 'Enviando...' : 'Enviar Avaliação'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
