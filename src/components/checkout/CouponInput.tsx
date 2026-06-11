import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Tag, X, Loader2, Check } from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_value?: number | null;
  max_uses?: number | null;
  used_count?: number | null;
  expires_at?: string | null;
  is_active?: boolean | null;
  discount?: number;
  final_value?: number;
}

interface CouponInputProps {
  subtotal: number;
  appliedCoupon: Coupon | null;
  onApplyCoupon: (coupon: Coupon) => void;
  onRemoveCoupon: () => void;
  serviceType?: string;  // e.g. 'consultation', 'pharmacy', 'delivery'
  eventType?: string;    // e.g. 'first_purchase', 'birthday'
}

export function CouponInput({ subtotal, appliedCoupon, onApplyCoupon, onRemoveCoupon, serviceType = 'order', eventType }: CouponInputProps) {
  const { user } = useAuth();
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Digite um código de cupom');
      return;
    }
    if (!user) { toast.error('Inicia sessão primeiro'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('validate_coupon', {
        _code: couponCode.toUpperCase().trim(),
        _user_id: user.id,
        _service_type: serviceType,
        _event_type: eventType ?? null,
        _order_value: subtotal,
      });
      if (error) { toast.error(error.message); return; }
      const r: any = data;
      if (!r?.valid) { toast.error(r?.error || 'Cupão inválido'); return; }
      onApplyCoupon({
        id: r.coupon_id, code: r.code,
        discount_type: r.discount_type, discount_value: r.discount_value,
        discount: r.discount, final_value: r.final_value,
      });
      setCouponCode('');
      toast.success(`Cupom "${r.code}" aplicado — desconto de ${r.discount} MZN`);
    } catch (error) {
      console.error('Coupon validation error:', error);
      toast.error('Erro ao validar cupom');
    } finally {
      setLoading(false);
    }
  };

  const calculateDiscount = (coupon: Coupon): number => {
    if (coupon.discount != null) return coupon.discount;
    if (coupon.discount_type === 'percentage') {
      return Math.round((subtotal * coupon.discount_value) / 100);
    }
    return coupon.discount_value;
  };

  if (appliedCoupon) {
    const discount = calculateDiscount(appliedCoupon);
    
    return (
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-800 dark:text-green-200">
                Cupom aplicado!
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                <span className="font-mono font-bold">{appliedCoupon.code}</span>
                {' • '}
                {appliedCoupon.discount_type === 'percentage' 
                  ? `${appliedCoupon.discount_value}% de desconto`
                  : `${appliedCoupon.discount_value} MZN de desconto`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-green-700 dark:text-green-300">
              -{discount} MZN
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemoveCoupon}
              className="h-8 w-8 text-green-600 hover:text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="h-4 w-4 text-primary" />
        <span className="font-medium">Cupom de Desconto</span>
      </div>
      <div className="flex gap-2">
        <Input
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          placeholder="Digite o código do cupom"
          className="font-mono uppercase"
          onKeyDown={(e) => e.key === 'Enter' && validateCoupon()}
        />
        <Button 
          onClick={validateCoupon} 
          disabled={loading || !couponCode.trim()}
          variant="secondary"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Aplicar'
          )}
        </Button>
      </div>
    </div>
  );
}

export function calculateCouponDiscount(coupon: Coupon | null, subtotal: number): number {
  if (!coupon) return 0;
  
  if (coupon.discount_type === 'percentage') {
    return Math.round((subtotal * coupon.discount_value) / 100);
  }
  return Math.min(coupon.discount_value, subtotal); // Can't discount more than subtotal
}
