// =============================================================================
// OfflineBanner — Prominent banner shown when user goes offline
// =============================================================================
// Uses CSS transitions instead of framer-motion for lighter bundle.
// =============================================================================

import { useState, useEffect } from 'react';
import { CloudOff, ShieldCheck, X, FileText, Wallet } from "@/components/icons/lucide-compat";
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/contexts/CountryContext';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { offlineManager } from '@/services/offline/OfflineManager';

const AUTO_HIDE_MS = 5000;

export function OfflineBanner() {
  const { t } = useTranslation();
  const { isOnline, getCachedProfile, getCachedPrescriptions, getCachedWalletBalance } =
    useOfflineMode();

  const [visible, setVisible] = useState(false);
  const [cachedPrescriptionCount, setCachedPrescriptionCount] = useState(0);
  const [hasProfile, setHasProfile] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      Promise.all([getCachedProfile(), getCachedPrescriptions()]).then(
        ([profile, prescriptions]) => {
          setHasProfile(!!profile);
          setCachedPrescriptionCount(prescriptions?.length ?? 0);
        }
      );
      const wallet = getCachedWalletBalance();
      setHasWallet(wallet !== null);

      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
      }, AUTO_HIDE_MS);

      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [isOnline, getCachedProfile, getCachedPrescriptions, getCachedWalletBalance]);

  const dismiss = () => setVisible(false);

  const handleClearCache = async () => {
    await offlineManager.clearCache();
    dismiss();
  };

  const summaryParts: string[] = [];
  if (hasProfile) summaryParts.push('1');
  if (cachedPrescriptionCount > 0) summaryParts.push(String(cachedPrescriptionCount));

  return (
    <div
      className={"fixed inset-x-0 top-0 z-[65] p-2 pt-12 pointer-events-none transition-all duration-300 ease-out"}
      style={{
        opacity: visible && !isOnline ? 1 : 0,
        transform: visible && !isOnline ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.95)',
      }}
    >
      <Card
        className="pointer-events-auto rounded-xl border-0 shadow-xl p-4 max-w-md mx-auto"
        style={{ backgroundColor: '#78350f' }}
      >
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1 bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="h-3.5 w-3.5 text-amber-200" />
        </button>

        <div className="flex items-center gap-2.5 mb-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15">
            <CloudOff className="h-4.5 w-4.5 text-amber-200" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-100">
              {t('offline.mode_active')}
            </h3>
            <p className="text-xs text-amber-200/70">
              {t('offline.offline_message')}
            </p>
          </div>
        </div>

        {summaryParts.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {hasProfile && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-100 bg-white/10 rounded-full px-2.5 py-1">
                <ShieldCheck className="h-3 w-3" />
                {t('offline.profile_cached')}
              </span>
            )}
            {cachedPrescriptionCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-100 bg-white/10 rounded-full px-2.5 py-1">
                <FileText className="h-3 w-3" />
                {t('offline.prescriptions_available', {
                  count: String(cachedPrescriptionCount),
                })}
              </span>
            )}
            {hasWallet && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-100 bg-white/10 rounded-full px-2.5 py-1">
                <Wallet className="h-3 w-3" />
                {t('offline.wallet_cached')}
              </span>
            )}
          </div>
        )}

        {summaryParts.length > 0 ? (
          <p className="text-[11px] text-amber-200/60 flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3" />
            {t('offline.data_safe')}
          </p>
        ) : (
          <p className="text-[11px] text-amber-200/60">
            {t('offline.no_connection')}
          </p>
        )}

        <div className="mt-3 pt-2 border-t border-white/10">
          <button
            onClick={handleClearCache}
            className="text-[10px] font-medium text-amber-300/60 hover:text-amber-200 transition-colors"
          >
            {t('offline.clear_cache')}
          </button>
        </div>
      </Card>
    </div>
  );
}
