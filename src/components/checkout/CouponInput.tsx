import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tag, X, Loader2, Check } from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_value: number | null;
  max_uses: number | null;
  used_count: number | null;
  expires_at: string | null;
  is_active: boolean | null;
}

interface CouponInputProps {
  subtotal: number;
  appliedCoupon: Coupon | null;
  onApplyCoupon: (coupon: Coupon) => void;
  onRemoveCoupon: () => void;
}

export function CouponInput({ subtotal, appliedCoupon, onApplyCoupon, onRemoveCoupon }: CouponInputProps) {
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Digite um código de cupom');
      return;
    }

    setLoading(true);
    
    try {
      // Fetch coupon by code
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase().trim())
        .single();

      if (error || !coupon) {
        toast.error('Cupom não encontrado');
        return;
      }

      // Validate coupon
      const validationError = validateCouponRules(coupon, subtotal);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      // Apply coupon
      onApplyCoupon(coupon);
      setCouponCode('');
      toast.success(`Cupom "${coupon.code}" aplicado com sucesso!`);
      
    } catch (error) {
      console.error('Coupon validation error:', error);
      toast.error('Erro ao validar cupom');
    } finally {
      setLoading(false);
    }
  };

  const validateCouponRules = (coupon: Coupon, orderSubtotal: number): string | null => {
    // Check if active
    if (!coupon.is_active) {
      return 'Este cupom está inativo';
    }

    // Check expiration
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return 'Este cupom expirou';
    }

    // Check max uses
    if (coupon.max_uses && (coupon.used_count || 0) >= coupon.max_uses) {
      return 'Este cupom atingiu o limite máximo de usos';
    }

    // Check minimum order value
    if (coupon.min_order_value && orderSubtotal < coupon.min_order_value) {
      return `Pedido mínimo de ${coupon.min_order_value} MZN para usar este cupom`;
    }

    return null;
  };

  const calculateDiscount = (coupon: Coupon): number => {
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
