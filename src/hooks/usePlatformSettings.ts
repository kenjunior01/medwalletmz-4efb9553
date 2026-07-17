import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PlatformSettings = {
  nearby_radius_km: number;
  nearby_ranking: 'distance' | 'rating' | 'price';
  platformName?: string;
  supportWhatsApp?: string;
  supportEmail?: string;
  defaultDeliveryFee?: number;
  minOrderValue?: number;
  maintenanceMode?: boolean;
  allowNewStoreRegistrations?: boolean;
  allowNewDriverRegistrations?: boolean;
  enableOrderNotifications?: boolean;
  enablePromotions?: boolean;
  [key: string]: any;
};

const DEFAULTS: PlatformSettings = {
  nearby_radius_km: 25,
  nearby_ranking: 'distance',
};

function coerce(v: any) {
  if (typeof v === 'string') {
    const s = v.replace(/^"|"$/g, '');
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (!Number.isNaN(Number(s)) && s.trim() !== '') return Number(s);
    return s;
  }
  return v;
}

export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from('platform_settings_public' as any).select('key, value');
      if (cancelled) return;
      const next: PlatformSettings = { ...DEFAULTS };
      (data || []).forEach((r: any) => { next[r.key] = coerce(r.value); });
      setSettings(next);
      setLoaded(true);
    };
    load();

    const channel = supabase
      .channel('platform-settings-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings' }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, []);

  return { settings, loaded };
}