import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Smartphone, Loader2, Apple, Wallet } from 'lucide-react';
import { CouponInput, calculateCouponDiscount } from '@/components/checkout/CouponInput';
import { Zap, FileText, Snowflake } from 'lucide-react';
interface AppliedCoupon {
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

type PayMethod = {
  id: string;
  name: string;
  icon: string;
  description: string;
  requiresPhone?: boolean;
  badge?: string;
};

const allPaymentMethods: PayMethod[] = [
  { id: 'wallet', name: 'Carteira MedWallet', icon: '💳', description: 'Débito direto do saldo MZN', badge: 'Instantâneo' },
  { id: 'mpesa', name: 'M-Pesa', icon: '📱', description: 'Vodacom M-Pesa', requiresPhone: true },
  { id: 'emola', name: 'e-Mola', icon: '💰', description: 'Movitel e-Mola', requiresPhone: true },
  { id: 'mkesh', name: 'Mkesh', icon: '🏦', description: 'BCI Mkesh', requiresPhone: true },
  { id: 'apple_pay', name: 'Apple Pay', icon: '', description: 'Toque para pagar (iOS/Safari)', badge: 'Rápido' },
  { id: 'google_pay', name: 'Google Pay', icon: '', description: 'Toque para pagar (Android/Chrome)', badge: 'Rápido' },
];

function detectSupportedPayments(): { applePay: boolean; googlePay: boolean } {
  if (typeof window === 'undefined') return { applePay: false, googlePay: false };
  const applePay = !!(window as any).ApplePaySession && (window as any).ApplePaySession.canMakePayments?.();
  const googlePay = typeof (window as any).PaymentRequest !== 'undefined';
  return { applePay: !!applePay, googlePay };
}

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart, currentStoreId } = useCart();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [supported] = useState(detectSupportedPayments());
  const paymentMethods = allPaymentMethods.filter(m => {
    if (m.id === 'apple_pay') return supported.applePay;
    if (m.id === 'google_pay') return supported.googlePay;
    return true;
  });
  const selectedMethod = paymentMethods.find(m => m.id === paymentMethod) || paymentMethods[0];
  const requiresPhone = !!selectedMethod?.requiresPhone;
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [requiresColdChain, setRequiresColdChain] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('active_prescription');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPrescriptionId(parsed.id);
        // Fetch cold-chain flag from prescription
        if (parsed.id) {
          supabase.from('prescriptions').select('requires_cold_chain').eq('id', parsed.id).maybeSingle()
            .then(({ data }) => setRequiresColdChain(!!data?.requires_cold_chain));
        }
      } catch {}
    }
  }, []);

  // Fetch dynamic delivery fee from the store
  useEffect(() => {
    const fetchDeliveryFee = async () => {
      const storeId = currentStoreId || items[0]?.store_id;
      if (!storeId) return;
      const { data } = await supabase
        .from('stores')
        .select('delivery_fee')
        .eq('id', storeId)
        .maybeSingle();
      setDeliveryFee(data?.delivery_fee ?? 50);
    };
    fetchDeliveryFee();
  }, [currentStoreId, items]);
  const discount = calculateCouponDiscount(appliedCoupon, subtotal);
  const total = subtotal + deliveryFee - discount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Faça login para continuar');
      navigate('/auth');
      return;
    }

    if (!address || (requiresPhone && !phoneNumber)) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Defensive: cart can be corrupted from older versions
    const storeId = currentStoreId || (items[0] as any)?.store_id;
    if (!storeId) {
      toast.error('Carrinho inválido. Limpe o carrinho e adicione os itens novamente.');
      clearCart();
      navigate('/cart');
      return;
    }

    setLoading(true);

    try {
      // Native wallet payments (Apple Pay / Google Pay) via PaymentRequest API
      if ((paymentMethod === 'apple_pay' || paymentMethod === 'google_pay') && typeof (window as any).PaymentRequest !== 'undefined') {
        try {
          const methodData: any[] = paymentMethod === 'apple_pay'
            ? [{ supportedMethods: 'https://apple.com/apple-pay', data: { version: 3, merchantIdentifier: 'merchant.mz.medwallet', merchantCapabilities: ['supports3DS'], supportedNetworks: ['visa','masterCard','amex'], countryCode: 'MZ' } }]
            : [{ supportedMethods: 'https://google.com/pay', data: { environment: 'TEST', apiVersion: 2, apiVersionMinor: 0, allowedPaymentMethods: [{ type: 'CARD', parameters: { allowedAuthMethods: ['PAN_ONLY','CRYPTOGRAM_3DS'], allowedCardNetworks: ['VISA','MASTERCARD'] } }] } }];
          const details = { total: { label: 'MedWallet', amount: { currency: 'MZN', value: String(total) } } };
          const pr = new (window as any).PaymentRequest(methodData, details);
          const canPay = await pr.canMakePayment().catch(() => false);
          if (!canPay) throw new Error('unavailable');
          const resp = await pr.show();
          await resp.complete('success');
        } catch (err: any) {
          if (err?.name === 'AbortError') { setLoading(false); return; }
          toast.error(`${selectedMethod?.name} indisponível neste dispositivo. Escolha outro método.`);
          setLoading(false);
          return;
        }
      }

      const notesWithCoupon = appliedCoupon
        ? `${notes ? notes + ' | ' : ''}Cupom: ${appliedCoupon.code} (-${discount} MZN)`
        : notes;

      // Create order (select only id to reduce chances of SELECT/RLS issues)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          store_id: storeId,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          delivery_address: address,
          notes: notesWithCoupon,
          status: 'pending',
          prescription_id: prescriptionId,
          is_priority: !!prescriptionId,
          requires_cold_chain: requiresColdChain,
          priority_level: requiresColdChain ? 10 : (prescriptionId ? 5 : 0),
        })
        .select('id')
        .maybeSingle();

      if (orderError) throw orderError;
      if (!order?.id) throw new Error('Falha ao criar pedido (sem id retornado)');

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      const isInstant = paymentMethod === 'wallet' || paymentMethod === 'apple_pay' || paymentMethod === 'google_pay';

      // Debit wallet if the user chose it
      if (paymentMethod === 'wallet') {
        const { error: walletErr } = await supabase.rpc('wallet_debit', {
          _user_id: user.id,
          _amount: total,
          _service_type: 'pharmacy_order',
          _ref_id: order.id,
          _description: `Pedido farmácia #${String(order.id).slice(0, 8)}`,
        });
        if (walletErr) throw walletErr;
      }

      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: order.id,
          user_id: user.id,
          amount: total,
          method: paymentMethod,
          phone_number: requiresPhone ? phoneNumber : null,
          status: isInstant ? 'confirmed' : 'pending',
        });

      if (paymentError) throw paymentError;

      // If coupon was used, increment used_count
      if (appliedCoupon) {
        const { error: couponError } = await supabase
          .from('coupons')
          .update({ used_count: (appliedCoupon.used_count || 0) + 1 })
          .eq('id', appliedCoupon.id);

        if (couponError) {
          console.error('Failed to update coupon count:', couponError);
        }

        // Record coupon usage by user
        await supabase
          .from('user_coupons')
          .insert({
            user_id: user.id,
            coupon_id: appliedCoupon.id,
            used_at: new Date().toISOString()
          });
      }

      // Clear cart and redirect to tracking
      clearCart();
      if (prescriptionId) sessionStorage.removeItem('active_prescription');
      toast.success('Pedido criado com sucesso!');
      navigate(`/order/${order.id}`);

    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error?.message || 'Erro ao processar pedido');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-muted-foreground mb-4">Seu carrinho está vazio</p>
        <Button onClick={() => navigate('/')}>Continuar Comprando</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card sticky top-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Finalizar Pedido</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {prescriptionId && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-semibold flex items-center gap-1">
                <Zap className="h-3 w-3 text-pharmacy" /> Pedido com receita médica
              </p>
              <p className="text-xs text-muted-foreground">
                Fila prioritária • Motorista verificado
                {requiresColdChain && ' • Cadeia de frio (friagem)'}
              </p>
            </div>
            {requiresColdChain && <Snowflake className="h-5 w-5 text-blue-500" />}
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h2 className="font-semibold mb-3">Resumo do Pedido</h2>
          <div className="space-y-2 text-sm">
            {items.map(item => (
              <div key={item.id} className="flex justify-between">
                <span>{item.quantity}x {item.name}</span>
                <span>{item.price * item.quantity} MZN</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{subtotal} MZN</span>
              </div>
              <div className="flex justify-between">
                <span>Taxa de Entrega</span>
                <span>{deliveryFee} MZN</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Desconto ({appliedCoupon?.code})</span>
                  <span>-{discount} MZN</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>Total</span>
                <span className="text-primary">{total} MZN</span>
              </div>
            </div>
          </div>
        </div>

        {/* Coupon Input */}
        <CouponInput
          subtotal={subtotal}
          appliedCoupon={appliedCoupon}
          onApplyCoupon={setAppliedCoupon}
          onRemoveCoupon={() => setAppliedCoupon(null)}
        />
        {/* Delivery Address */}
        <div className="space-y-3">
          <Label>Endereço de Entrega *</Label>
          <Textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Rua, número, bairro, referência..."
            required
          />
        </div>

        {/* Notes */}
        <div className="space-y-3">
          <Label>Notas (opcional)</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Instruções especiais..."
          />
        </div>

        {/* Payment Method */}
        <div className="space-y-3">
          <Label>Método de Pagamento *</Label>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="grid gap-3">
              {paymentMethods.map(method => (
                <div key={method.id} className="flex items-center space-x-3">
                  <RadioGroupItem value={method.id} id={method.id} />
                  <label 
                    htmlFor={method.id}
                    className="flex items-center gap-3 flex-1 cursor-pointer p-3 rounded-lg border border-border hover:bg-muted/50"
                  >
                    <span className="text-2xl">{method.icon}</span>
                    <div>
                      <p className="font-medium">{method.name}</p>
                      <p className="text-xs text-muted-foreground">{method.description}</p>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        {/* Phone Number */}
        <div className="space-y-3">
          <Label>Número de Telefone ({paymentMethods.find(m => m.id === paymentMethod)?.name}) *</Label>
          <div className="relative">
            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="84 xxx xxxx"
              className="pl-10"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Receberá uma notificação para confirmar o pagamento
          </p>
        </div>

        {/* Submit */}
        <Button 
          type="submit" 
          className="w-full h-12 text-lg"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>Pagar {total} MZN</>
          )}
        </Button>
      </form>
    </div>
  );
}
