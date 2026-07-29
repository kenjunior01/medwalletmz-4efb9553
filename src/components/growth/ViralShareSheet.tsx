import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import { useLocation as useAppLocation } from '@/contexts/LocationContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import NumberFlow from '@number-flow/react';
import {
  Share2, Copy, MessageCircle, Send, QrCode,
  X, Check, Gift, Users, TrendingUp, Sparkles, MapPin
} from '@/components/icons/lucide-compat';

interface ViralShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  province?: string;
}

/* ── Simple QR Code SVG Generator ── */
function QRCodeSVG({ value, size = 120 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Generate a deterministic pattern from the string
    const cells = 21;
    const cellSize = size / cells;

    canvas.width = size;
    canvas.height = size;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Simple deterministic pattern based on string hash
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    // Draw QR-like pattern
    ctx.fillStyle = '#111827';

    // Position detection patterns (corners)
    const drawFinder = (x: number, y: number) => {
      // Outer
      ctx.fillRect(x * cellSize, y * cellSize, 7 * cellSize, 7 * cellSize);
      // Inner white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect((x + 1) * cellSize, (y + 1) * cellSize, 5 * cellSize, 5 * cellSize);
      // Inner black
      ctx.fillStyle = '#111827';
      ctx.fillRect((x + 2) * cellSize, (y + 2) * cellSize, 3 * cellSize, 3 * cellSize);
    };

    drawFinder(0, 0);
    drawFinder(cells - 7, 0);
    drawFinder(0, cells - 7);

    // Data modules
    for (let row = 0; row < cells; row++) {
      for (let col = 0; col < cells; col++) {
        // Skip finder areas
        if ((row < 8 && col < 8) || (row < 8 && col >= cells - 8) || (row >= cells - 8 && col < 8)) continue;
        // Timing patterns
        if (row === 6 || col === 6) {
          if ((row + col) % 2 === 0) {
            ctx.fillStyle = '#111827';
            ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
          }
          continue;
        }
        if (seededRandom(hash + row * cells + col) > 0.55) {
          ctx.fillStyle = '#111827';
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }

    setDataUrl(canvas.toDataURL('image/png'));
  }, [value, size]);

  if (!dataUrl) return null;

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <img src={dataUrl} alt="QR Code" width={size} height={size} className="rounded-xl" />
    </>
  );
}

export function ViralShareSheet({ open, onOpenChange, province }: ViralShareSheetProps) {
  const { user } = useAuth();
  const { country, t } = useCountry();
  const { city } = useAppLocation();
  const [copied, setCopied] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);

  // Fetch referral stats
  const { data: stats } = useQuery({
    queryKey: ['referral-stats', user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data: refs } = await supabase
        .from('user_referrals')
        .select('bonus_mzn, bonus_coins, status')
        .eq('referrer_id', user!.id);

      const totalReferrals = refs?.length || 0;
      const converted = refs?.filter(r => r.status === 'completed').length || 0;
      const totalEarnings = refs?.reduce((a, r) => a + (Number(r.bonus_mzn) || 0), 0) || 0;
      const totalCoins = refs?.reduce((a, r) => a + (Number(r.bonus_coins) || 0), 0) || 0;

      return { totalReferrals, converted, totalEarnings, totalCoins };
    },
  });

  // Fetch referral code
  const { data: profile } = useQuery({
    queryKey: ['profile-share', user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('referral_code, full_name')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
  });

  const code = profile?.referral_code || (user ? `MED${user.id.replace(/-/g, '').slice(0, 6).toUpperCase()}` : '');
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://medwalletmz.online';
  const shareLink = province
    ? `${baseUrl}/?ref=${code}&province=${encodeURIComponent(province)}`
    : `${baseUrl}/?ref=${code}`;

  const shareMessages = useMemo(() => ({
    whatsapp: `Estou a usar a MedWallet para falar com médicos e receber medicamentos em Moçambique 🇲🇿. Usa o meu código ${code} e ambos ganhamos bónus: ${shareLink}`,
    telegram: `🇲🇿 MedWallet — consultas + farmácia + entregas ao domicílio em Moçambique.\n\nUsa o meu código ${code} e ambos ganhamos bónus:\n${shareLink}`,
    facebook: `Acabei de descobrir a MedWallet — consultas médicas, farmácia 24h e entregas ao domicílio em Moçambique. Usa o meu código ${code}: ${shareLink}`,
    x: `A revolução da saúde em Moçambique chegou 🇲🇿. MedWallet: consultas + farmácia + entregas. Código ${code}: ${shareLink} #MedWalletMZ #SaudeMocambique`,
    sms: `MedWallet MZ 🇲🇿 Consultas + farmácia + entregas. Código: ${code} ${shareLink}`,
  }), [code, shareLink]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success(t('referrals.copied') || 'Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = shareLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success(t('referrals.copied') || 'Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareLink, t]);

  const shareToNative = useCallback(async () => {
    const text = shareMessages.whatsapp;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MedWallet — Convida Amigos',
          text,
          url: shareLink,
        });
        return;
      } catch {
        // User cancelled or not supported
      }
    }
    copyLink();
  }, [shareMessages, shareLink, copyLink]);

  const shareToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessages.whatsapp)}`, '_blank');
  };

  const shareToTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(shareMessages.telegram)}`, '_blank');
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}&quote=${encodeURIComponent(shareMessages.facebook)}`, '_blank');
  };

  const shareToX = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessages.x)}`, '_blank');
  };

  const shareToSMS = () => {
    window.open(`sms:?body=${encodeURIComponent(shareMessages.sms)}`, '_blank');
  };

  const shareOptions = [
    { key: 'whatsapp', label: t('referrals.share_whatsapp') || 'WhatsApp', icon: MessageCircle, color: 'bg-emerald-500 hover:bg-emerald-600 text-white', action: shareToWhatsApp },
    { key: 'telegram', label: t('referrals.share_telegram') || 'Telegram', icon: Send, color: 'bg-sky-500 hover:bg-sky-600 text-white', action: shareToTelegram },
    { key: 'facebook', label: t('referrals.share_facebook') || 'Facebook', icon: Users, color: 'bg-blue-600 hover:bg-blue-700 text-white', action: shareToFacebook },
    { key: 'x', label: t('referrals.share_x') || 'X (Twitter)', icon: Share2, color: 'bg-gray-900 hover:bg-gray-800 text-white', action: shareToX },
    { key: 'sms', label: t('referrals.share_sms') || 'SMS', icon: MessageCircle, color: 'bg-indigo-500 hover:bg-indigo-600 text-white', action: shareToSMS },
  ];

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[2.5rem] px-0 pb-12 max-h-[92vh] overflow-y-auto border-t-2 border-primary/20 shadow-2xl">
        {/* ── Handle ── */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="px-6">
          {/* ── Header ── */}
          <SheetHeader className="mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Gift className="h-5 w-5 text-white" />
              </div>
              <div>
                <SheetTitle className="text-xl font-black">
                  {t('referrals.share_sheet_title') || 'Convida Amigos'}
                </SheetTitle>
                <SheetDescription className="text-sm font-medium text-muted-foreground">
                  {t('referrals.share_sheet_subtitle') || 'Partilha e ganha bónus por cada amigo que entrar'}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* ── Province Context ── */}
          {province && (
            <div className="flex items-center gap-2 rounded-2xl bg-teal-50 border border-teal-200 p-3 mb-4">
              <MapPin className="h-4 w-4 text-teal-600" />
              <p className="text-sm font-bold text-teal-700">
                Convida amigos de {province} para a MedWallet
              </p>
            </div>
          )}

          {/* ── Stats Row ── */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 p-3 text-center">
              <Users className="h-4 w-4 mx-auto text-teal-600 mb-1" />
              <p className="text-lg font-black text-teal-800 tabular-nums">
                <NumberFlow value={stats?.totalReferrals || 0} />
              </p>
              <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wide">
                {t('referrals.share_total_referrals') || 'Total de Indicações'}
              </p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 p-3 text-center">
              <TrendingUp className="h-4 w-4 mx-auto text-indigo-600 mb-1" />
              <p className="text-lg font-black text-indigo-800 tabular-nums">
                <NumberFlow value={stats?.converted || 0} />
              </p>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">
                {t('referrals.share_converted') || 'Convertidos'}
              </p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 p-3 text-center">
              <Sparkles className="h-4 w-4 mx-auto text-amber-600 mb-1" />
              <p className="text-lg font-black text-amber-800 tabular-nums">
                <NumberFlow value={stats?.totalEarnings || 0} />
              </p>
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">
                {country?.currency_code || 'MZN'}
              </p>
            </div>
          </div>

          {/* ── Earnings Banner ── */}
          {stats && stats.totalEarnings > 0 && (
            <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-indigo-600 p-4 mb-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-300" />
                  <p className="text-sm font-bold">
                    {t('referrals.share_earnings') || 'Os teus ganhos com indicações'}
                  </p>
                </div>
                <p className="text-xl font-black tabular-nums">
                  <NumberFlow value={stats.totalEarnings} /> {country?.currency_code || 'MZN'}
                </p>
              </div>
            </div>
          )}

          {/* ── Referral Code ── */}
          <div className="flex items-center gap-3 rounded-2xl bg-muted/50 border border-border p-3 mb-5">
            <div className="flex-1">
              <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">{t('referrals.your_code')}</p>
              <p className="text-2xl font-black font-mono tracking-widest text-primary">{code}</p>
            </div>
            <Button
              size="sm"
              variant={copied ? 'default' : 'outline'}
              className={`h-10 rounded-xl font-bold ${copied ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
              onClick={copyLink}
            >
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? 'OK' : (t('referrals.share_copy_link') || 'Copiar Link')}
            </Button>
          </div>

          {/* ── Share Buttons Grid ── */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {shareOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    opt.action();
                    onOpenChange(false);
                  }}
                  className={`flex items-center gap-3 rounded-2xl p-4 font-bold text-sm transition-all active:scale-[0.98] shadow-sm hover:shadow-md ${opt.color}`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}

            {/* Native Share (fallback) */}
            <button
              onClick={shareToNative}
              className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-600 hover:to-indigo-600 p-4 font-bold text-sm text-white transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
            >
              <Share2 className="h-5 w-5 shrink-0" />
              <span className="truncate">Mais Opções</span>
            </button>

            {/* QR Code toggle */}
            <button
              onClick={() => setQrVisible(!qrVisible)}
              className={`flex items-center gap-3 rounded-2xl p-4 font-bold text-sm transition-all active:scale-[0.98] shadow-sm hover:shadow-md ${
                qrVisible
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-white border-2 border-dashed border-border hover:border-amber-300 text-foreground'
              }`}
            >
              <QrCode className="h-5 w-5 shrink-0" />
              <span className="truncate">{t('referrals.share_qr_code') || 'Código QR'}</span>
            </button>
          </div>

          {/* ── QR Code ── */}
          {qrVisible && (
            <div className="flex flex-col items-center rounded-2xl bg-white border border-border p-6 mb-2">
              <QRCodeSVG value={shareLink} size={160} />
              <p className="text-xs text-muted-foreground font-medium mt-3 text-center">
                Escaneia este código QR para te registares com o código <span className="font-bold text-primary">{code}</span>
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
