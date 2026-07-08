import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, User, MessageSquare, Plus, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface UniversalReviewsProps {
  storeId?: string;
  clinicId?: string;
  entityName: string;
}

export function UniversalReviews({ storeId, clinicId, entityName }: UniversalReviewsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews', storeId || clinicId],
    queryFn: async () => {
      let q = supabase.from('reviews').select('*');
      if (storeId) q = q.eq('store_id', storeId);
      if (clinicId) q = q.eq('clinic_id', clinicId);
      const { data, error } = await q.order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!(storeId || clinicId)
  });

  const submitReview = async () => {
    if (!user) return toast.error('Inicia sessão para avaliar');
    if (rating === 0) return toast.error('Escolhe uma pontuação');
    setSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        user_id: user.id,
        store_id: storeId || null,
        clinic_id: clinicId || null,
        rating,
        comment: comment.trim() || null
      });
      if (error) throw error;
      toast.success('Avaliação enviada!');
      setIsModalOpen(false);
      setRating(0);
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['reviews', storeId || clinicId] });
      queryClient.invalidateQueries({ queryKey: ['store', storeId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Avaliações ({reviews?.length || 0})
        </h3>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1">
              <Plus className="h-3.5 w-3.5" /> Avaliar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Avaliar {entityName}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRating(s)} className="focus:outline-none">
                    <Star className={cn("h-8 w-8 transition-colors", s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Partilha a tua experiência..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="text-sm"
              />
              <Button onClick={submitReview} className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Publicar Avaliação
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {reviews?.map((r) => (
          <div key={r.id} className="bg-muted/30 rounded-xl p-3 border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={cn("h-2.5 w-2.5", s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} />
                  ))}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(r.created_at), "dd MMM yyyy", { locale: pt })}
              </span>
            </div>
            {r.comment && <p className="text-xs text-muted-foreground leading-relaxed">{r.comment}</p>}
          </div>
        ))}
        {(!reviews || reviews.length === 0) && (
          <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed">
            <Star className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Ainda sem comentários. Sê o primeiro!</p>
          </div>
        )}
      </div>
    </div>
  );
}
