import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { GoogleAddressInput } from '@/components/maps/GoogleAddressInput';
import { CouponInput } from '@/components/checkout/CouponInput';
import { useCountry } from '@/contexts/CountryContext';
import { ArrowLeft, Smartphone, Loader2, Apple, Wallet, Zap, FileText, Snowflake, Globe, Copy, ExternalLink, CheckCircle2 } from 'lucide-react';
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
  { id: 'paypal', name: 'PayPal', icon: '🅿️', description: 'Pagamento global seguro', badge: 'Global' },
  { id: 'apple_pay', name: 'Apple Pay', icon: '', description: 'Toque para pagar (iOS/Safari)', badge: 'Rápido' },
  { id: 'google_pay', name: 'Google Pay', icon: '', description: 'Toque para pagar (Android/Chrome)', badge: 'Rápido' },
];

function detectSupportedPayments(): { applePay: boolean; googlePay: boolean } {
  if (typeof window === 'undefined') return { applePay: false, googlePay: false };
  const applePay = !!(window as any).ApplePaySession && (window as any).ApplePaySession.canMakePayments?.();
  const googlePay = typeof (window as any).PaymentRequest !== 'undefined';
  return { applePay: !!applePay, googlePay };
}

function calculateCouponDiscount(coupon: AppliedCoupon | null, subtotal: number): number {
  if (!coupon) return 0;
  if (coupon.discount_type === 'percentage') {
    return Math.floor((subtotal * coupon.discount_value) / 100);
  }
  return coupon.discount_value;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart, currentStoreId } = useCart();
  const { user } = useAuth();
  const { country, t } = useCountry();

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [supported] = useState(detectSupportedPayments());

  const paymentMethods = useMemo(() => {
    if (!country?.config?.payment_methods) return allPaymentMethods;

    const countryMethods = country.config.payment_methods.map((m: any) => ({
      id: m.id,
      name: m.name,
      icon: m.icon,
      description: m.description,
      requiresPhone: m.requires_phone || m.type === 'mobile_money',
      badge: m.badge
    }));

    if (supported.applePay) {
      countryMethods.push({ id: 'apple_pay', name: 'Apple Pay', icon: '🍎', description: 'Toque para pagar', badge: 'Rápido' });
    }
    if (supported.googlePay) {
      countryMethods.push({ id: 'google_pay', name: 'Google Pay', icon: '🤖', description: 'Toque para pagar', badge: 'Rápido' });
    }

    return countryMethods;
  }, [country, supported]);

  useEffect(() => {
    if (paymentMethods.length > 0 && !paymentMethod) {
      setPaymentMethod(paymentMethods[0].id);
    }
  }, [paymentMethods, paymentMethod]);
  const selectedMethod = paymentMethods.find(m => m.id === paymentMethod) || paymentMethods[0];
  const requiresPhone = !!selectedMethod?.requiresPhone;
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [requiresColdChain, setRequiresColdChain] = useState(false);
  const [showQR, setShowQR] = useState<{ code: string; type: 'qr' | 'link' } | null>(null);

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

      // New Global Payment Logic for PIX/UPI/Stripe/PayPal
      if (['pix', 'upi', 'stripe', 'paystack', 'ozow', 'paypal'].includes(paymentMethod)) {
        const { data: globalPay, error: gpError } = await supabase.functions.invoke('process-global-payment', {
          body: {
            order_id: order.id,
            user_id: user.id,
            method: paymentMethod,
            amount: total,
            country_id: country?.id
          }
        });

        if (gpError) throw gpError;

        if (globalPay.qr_code) {
          setShowQR({ code: globalPay.qr_code, type: globalPay.method_type });
          setLoading(false);
          return; // Wait for QR interaction
        }
      }

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
        <p className="text-muted-foreground mb-4">{t('checkout.empty_cart')}</p>
        <Button onClick={() => navigate('/')}>{t('checkout.continue_shopping')}</Button>
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
        <h1 className="text-lg font-semibold">{t('checkout.title')}</h1>
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
          <h2 className="font-semibold mb-3">{t('checkout.summary')}</h2>
          <div className="space-y-2 text-sm">
            {items.map(item => (
              <div key={item.id} className="flex justify-between">
                <span>{item.quantity}x {item.name}</span>
                <span>{item.price * item.quantity} {country?.currency_symbol || 'MZN'}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2">
              <div className="flex justify-between">
                <span>{t('checkout.subtotal')}</span>
                <span>{subtotal} {country?.currency_symbol || 'MZN'}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('checkout.delivery_fee')}</span>
                <span>{deliveryFee} {country?.currency_symbol || 'MZN'}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>{t('checkout.discount')} ({appliedCoupon?.code})</span>
                  <span>-{discount} {country?.currency_symbol || 'MZN'}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>{t('checkout.total')}</span>
                <span className="text-primary">{total} {country?.currency_symbol || 'MZN'}</span>
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
        <GoogleAddressInput
          value={address}
          onChange={(val) => setAddress(val)}
          placeholder="Rua, número, bairro, referência..."
          label={`${t('checkout.address')} *`}
        />

        {/* Notes */}
        <div className="space-y-3">
          <Label>{t('checkout.notes')}</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('checkout.notes_placeholder')}
          />
        </div>

        {/* Payment Method */}
        <div className="space-y-3">
          <Label>{t('checkout.payment_method')} *</Label>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="grid gap-3">
              {paymentMethods.map(method => (
                <div key={method.id} className="flex items-center space-x-3">
                  <RadioGroupItem value={method.id} id={method.id} />
                  <label 
                    htmlFor={method.id}
                    className={`flex items-center gap-3 flex-1 cursor-pointer p-3 rounded-xl border transition ${paymentMethod === method.id ? 'border-primary bg-primary/5 ring-1 ring-primary/40' : 'border-border hover:bg-muted/50'}`}
                  >
                    {method.id === 'apple_pay' ? (
                      <Apple className="h-6 w-6" />
                    ) : method.id === 'google_pay' ? (
                      <span className="text-xl font-black tracking-tight">G Pay</span>
                    ) : method.id === 'wallet' ? (
                      <Wallet className="h-6 w-6 text-primary" />
                    ) : (
                      <span className="text-2xl">{method.icon}</span>
                    )}
                    <div className="flex-1">
                      <p className="font-medium flex items-center gap-2">
                        {method.name}
                        {method.badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">{method.badge}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{method.description}</p>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        {/* Phone Number — only for mobile money */}
        {requiresPhone && (
        <div className="space-y-3">
          <Label>{t('checkout.phone_label', { method: selectedMethod?.name })} *</Label>
          <div className="relative">
            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={t('checkout.phone_placeholder')}
              className="pl-10"
              required={requiresPhone}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Receberá uma notificação para confirmar o pagamento
          </p>
        </div>
        )}

        {/* Submit */}
        <Button 
          type="submit" 
          className="w-full h-12 text-lg"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              {paymentMethod === 'apple_pay' && <Apple className="h-5 w-5 mr-2" />}
              {paymentMethod === 'wallet' && <Wallet className="h-5 w-5 mr-2" />}
              {t('checkout.pay_button', { amount: String(total), currency: country?.currency_symbol || 'MZN' })}
            </>
          )}
        </Button>
      </form>

      {/* PIX / UPI / QR Code Dialog */}
      <Dialog open={!!showQR} onOpenChange={(open) => !open && setShowQR(null)}>
        <DialogContent className="max-w-[90vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center">Pagamento via {selectedMethod?.name}</DialogTitle>
            <DialogDescription className="text-center">
              {showQR?.type === 'qr'
                ? 'Escaneie o código abaixo com a app do seu banco para finalizar.'
                : 'Clique no botão abaixo para concluir o pagamento seguro.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-6 py-4">
            {showQR?.type === 'qr' ? (
              <>
                <div className="p-4 bg-white rounded-2xl border-2 border-primary/20 shadow-inner">
                  {/* Real QR would be generated here, using placeholder for demo */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(showQR.code)}`}
                    alt="Payment QR Code"
                    className="w-48 h-48"
                  />
                </div>

                <div className="w-full space-y-2">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground text-center">Código Copia e Cola</p>
                  <div className="flex gap-2 p-2 bg-muted rounded-lg border">
                    <code className="text-[10px] break-all flex-1 line-clamp-2">{showQR.code}</code>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(showQR.code);
                        toast.success('Código copiado!');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <Button
                className="w-full h-14 text-lg gap-2"
                onClick={() => window.open(showQR?.code, '_blank')}
              >
                Abrir Portal de Pagamento <ExternalLink className="h-5 w-5" />
              </Button>
            )}

            <div className="w-full pt-4 border-t space-y-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Aguardando confirmação do banco...
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  toast.success('Pedido confirmado! Redirecionando...');
                  clearCart();
                  navigate('/orders');
                }}
              >
                Já paguei
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
