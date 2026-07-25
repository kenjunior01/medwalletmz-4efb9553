// =============================================================================
// MedWallet — OfflineManager Service
// =============================================================================
// Manages offline data caching and sync queue using localStorage.
// Designed for PWA offline-first scenarios where Supabase is unreachable.
//
// Storage keys:
//   mz_offline_queue     — JSON array of pending mutations
//   mz_offline_profile   — JSON object of cached user profile
//   mz_offline_prescriptions — JSON array of cached prescriptions
//   mz_offline_wallet    — JSON number (cached wallet balance)
//   mz_offline_last_sync — ISO timestamp string
// =============================================================================

import { supabase } from '@/integrations/supabase/client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface OfflineQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: Record<string, any>;
  timestamp: number;
  synced: boolean;
}

type SyncResult = {
  success: number;
  failed: number;
};

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  queue: 'mz_offline_queue',
  profile: 'mz_offline_profile',
  prescriptions: 'mz_offline_prescriptions',
  wallet: 'mz_offline_wallet',
  lastSync: 'mz_offline_last_sync',
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function safeGetItem<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSetItem(key: string, value: unknown): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[OfflineManager] Failed to write ${key}:`, err);
  }
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[OfflineManager] Failed to remove ${key}:`, err);
  }
}

// ── OfflineManager Singleton ────────────────────────────────────────────────

class OfflineManager {
  private static instance: OfflineManager;
  private queue: OfflineQueueItem[] = [];
  private _isOnline: boolean;
  private initialized = false;

  private constructor() {
    this._isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  // ── Initialization ──────────────────────────────────────────────────────

  /** Load persisted queue from localStorage. Call once on app start. */
  init(): void {
    if (this.initialized) return;
    this.queue = safeGetItem<OfflineQueueItem[]>(STORAGE_KEYS.queue, []);
    this.initialized = true;

    // Listen for connectivity changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this._isOnline = true;
        this.processQueue();
      });
      window.addEventListener('offline', () => {
        this._isOnline = false;
      });
    }
  }

  // ── Online Status ──────────────────────────────────────────────────────

  isOnline(): boolean {
    return this._isOnline;
  }

  // ── Sync Queue ────────────────────────────────────────────────────────

  async addToQueue(
    type: 'create' | 'update' | 'delete',
    table: string,
    data: Record<string, any>,
  ): Promise<void> {
    const item: OfflineQueueItem = {
      id: generateId(),
      type,
      table,
      data,
      timestamp: Date.now(),
      synced: false,
    };

    this.queue.push(item);
    this.persistQueue();

    console.log(`[OfflineManager] Queued ${type} on ${table}`, item.id);
  }

  /** Process pending mutations against Supabase. Called automatically on reconnect. */
  async processQueue(): Promise<SyncResult> {
    if (!this._isOnline) {
      return { success: 0, failed: 0 };
    }

    const pending = this.queue.filter((item) => !item.synced);
    if (pending.length === 0) {
      return { success: 0, failed: 0 };
    }

    console.log(`[OfflineManager] Processing ${pending.length} queued items...`);

    let success = 0;
    let failed = 0;

    for (const item of pending) {
      try {
        const { error } = await this.executeMutation(item);
        if (error) {
          console.error(`[OfflineManager] Mutation failed (${item.id}):`, error.message);
          failed++;
        } else {
          item.synced = true;
          success++;
        }
      } catch (err) {
        console.error(`[OfflineManager] Mutation error (${item.id}):`, err);
        failed++;
      }
    }

    // Remove synced items from queue
    this.queue = this.queue.filter((item) => !item.synced);
    this.persistQueue();

    // Update last sync timestamp
    if (success > 0) {
      safeSetItem(STORAGE_KEYS.lastSync, new Date().toISOString());
    }

    console.log(`[OfflineManager] Sync complete: ${success} ok, ${failed} failed`);
    return { success, failed };
  }

  private async executeMutation(item: OfflineQueueItem): Promise<{ error: Error | null }> {
    switch (item.type) {
      case 'create': {
        const { error } = await supabase
          .from(item.table)
          .insert(item.data as any);
        return { error: error ? new Error(error.message) : null };
      }
      case 'update': {
        const pk = item.data.id;
        const payload = { ...item.data };
        delete payload.id;
        const { error } = await supabase
          .from(item.table)
          .update(payload as any)
          .eq('id', pk);
        return { error: error ? new Error(error.message) : null };
      }
      case 'delete': {
        const pk = item.data.id;
        const { error } = await supabase
          .from(item.table)
          .delete()
          .eq('id', pk as any);
        return { error: error ? new Error(error.message) : null };
      }
      default:
        return { error: new Error(`Unknown mutation type: ${(item as any).type}`) };
    }
  }

  private persistQueue(): void {
    safeSetItem(STORAGE_KEYS.queue, this.queue);
  }

  // ── Cache Critical Data ────────────────────────────────────────────────

  async cacheProfile(userId: string): Promise<void> {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        safeSetItem(STORAGE_KEYS.profile, data);
        console.log('[OfflineManager] Profile cached');
      }
    } catch (err) {
      console.warn('[OfflineManager] Failed to cache profile:', err);
    }
  }

  async cachePrescriptions(userId: string): Promise<void> {
    try {
      const { data } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        safeSetItem(STORAGE_KEYS.prescriptions, data);
        console.log('[OfflineManager] Prescriptions cached:', data.length);
      }
    } catch (err) {
      console.warn('[OfflineManager] Failed to cache prescriptions:', err);
    }
  }

  async cacheWalletBalance(userId: string): Promise<void> {
    try {
      const { data } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        safeSetItem(STORAGE_KEYS.wallet, (data as any).balance ?? 0);
        console.log('[OfflineManager] Wallet balance cached');
      }
    } catch (err) {
      console.warn('[OfflineManager] Failed to cache wallet balance:', err);
    }
  }

  /** Cache all critical data for a user (call when going online or on login). */
  async cacheAll(userId: string): Promise<void> {
    await Promise.all([
      this.cacheProfile(userId),
      this.cachePrescriptions(userId),
      this.cacheWalletBalance(userId),
    ]);
    safeSetItem(STORAGE_KEYS.lastSync, new Date().toISOString());
  }

  // ── Retrieve Cached Data ───────────────────────────────────────────────

  getCachedProfile(): Record<string, any> | null {
    return safeGetItem<Record<string, any> | null>(STORAGE_KEYS.profile, null);
  }

  getCachedPrescriptions(): Record<string, any>[] | null {
    return safeGetItem<Record<string, any>[] | null>(STORAGE_KEYS.prescriptions, null);
  }

  getCachedWalletBalance(): number | null {
    return safeGetItem<number | null>(STORAGE_KEYS.wallet, null);
  }

  // ── Cache Management ───────────────────────────────────────────────────

  async clearCache(): Promise<void> {
    Object.values(STORAGE_KEYS).forEach((key) => {
      safeRemoveItem(key);
    });
    this.queue = [];
    this.persistQueue();
    console.log('[OfflineManager] Cache cleared');
  }

  // ── Queue Info ─────────────────────────────────────────────────────────

  getQueueSize(): number {
    return this.queue.filter((item) => !item.synced).length;
  }

  getLastSyncTime(): Date | null {
    const iso = safeGetItem<string | null>(STORAGE_KEYS.lastSync, null);
    if (!iso) return null;
    try {
      return new Date(iso);
    } catch {
      return null;
    }
  }
}

// ── Export singleton ─────────────────────────────────────────────────────────

export const offlineManager = OfflineManager.getInstance();
