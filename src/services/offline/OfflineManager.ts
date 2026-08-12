// =============================================================================
// MedWallet — OfflineManager Service
// =============================================================================
// Manages offline data caching and sync queue.
// Sensitive data (prescriptions, profile) is encrypted using AES-GCM before
// being stored in localStorage, keyed by the user's session token.
//
// Storage keys:
//   mz_offline_queue     — JSON array of pending mutations (non-sensitive)
//   mz_offline_profile   — AES-GCM encrypted JSON of cached user profile
//   mz_offline_prescriptions — AES-GCM encrypted JSON array of cached prescriptions
//   mz_offline_wallet    — JSON number (cached wallet balance — non-sensitive)
//   mz_offline_last_sync — ISO timestamp string
// =============================================================================

import { supabase as typedSupabase } from '@/integrations/supabase/client';
// Cast para acesso a tabelas ainda não presentes nos tipos gerados
const supabase = typedSupabase as any;

// ── Types ────────────────────────────────────────────────────────────────────

export interface OfflineQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: Record<string, any>;
  timestamp: number;
  synced: boolean;
  retryCount: number;
  nextRetryAt: number;
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

/** Keys prefixed with this are sensitive and must be encrypted */
const ENCRYPTED_KEYS = new Set([STORAGE_KEYS.profile, STORAGE_KEYS.prescriptions]);

// ── Encryption Helpers (AES-GCM via Web Crypto API) ───────────────────────

/** Derive a 256-bit AES key from the user's access token */
async function deriveKey(): Promise<CryptoKey | null> {
  try {
    if (typeof window === 'undefined' || !window.crypto?.subtle) return null;
    // Get the current session token from localStorage (Supabase stores it here)
    const authData = localStorage.getItem('sb-pfqruzusjjxyidhqkiob-auth-token');
    if (!authData) return null;
    const parsed = JSON.parse(authData);
    const token = parsed?.access_token;
    if (!token) return null;

    // Import token as raw key material
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(token.slice(0, 64)), // Use first 64 chars of token
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive AES-256-GCM key
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('medwallet-offline-v1'), // Fixed salt for deterministic derivation
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  } catch {
    return null;
  }
}

/** Encrypt a JSON-serializable value, returns base64 string */
async function encrypt<T>(value: T): Promise<string> {
  const key = await deriveKey();
  if (!key) {
    // Fallback: if encryption not available, store with a prefix warning
    console.warn('[OfflineManager] Encryption unavailable, storing as plaintext (dev only)');
    return 'PLAIN:' + JSON.stringify(value);
  }
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  // Combine IV + ciphertext and base64 encode
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return uint8ToBase64(combined);
}

/** Decrypt a value that was encrypted with encrypt() */
async function decrypt<T>(encrypted: string): Promise<T | null> {
  try {
    // Handle plaintext fallback
    if (encrypted.startsWith('PLAIN:')) {
      return JSON.parse(encrypted.slice(6)) as T;
    }
    const key = await deriveKey();
    if (!key) return null;

    const combined = base64ToUint8(encrypted);
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(decrypted)) as T;
  } catch {
    console.warn('[OfflineManager] Failed to decrypt data (key may have changed after login)');
    return null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert Uint8Array to base64 — safe for large arrays (chunked btoa) */
function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 8192;
  let result = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    let binary = '';
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
    result += btoa(binary);
  }
  return result;
}

/** Convert base64 to Uint8Array — chunked atob for large strings */
function base64ToUint8(base64: string): Uint8Array {
  const chunkSize = 8192;
  const totalLen = base64.length;
  // Calculate decoded length efficiently without decoding
  const binaryLen = Math.ceil(totalLen / 4) * 3 - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
  const bytes = new Uint8Array(binaryLen);
  let offset = 0;
  for (let i = 0; i < totalLen; i += chunkSize) {
    const chunk = base64.slice(i, Math.min(i + chunkSize, totalLen));
    const binary = atob(chunk);
    for (let j = 0; j < binary.length; j++) {
      bytes[offset++] = binary.charCodeAt(j);
    }
  }
  return bytes;
}

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

      // Retry timer: check for due retries every 30s
      setInterval(() => {
        if (this._isOnline && this.queue.some(i => !i.synced && i.retryCount > 0 && i.retryCount < 3 && i.nextRetryAt <= Date.now())) {
          this.processQueue();
        }
      }, 30_000);
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
      retryCount: 0,
      nextRetryAt: 0,
    };

    this.queue.push(item);
    this.persistQueue();

    console.log(`[OfflineManager] Queued ${type} on ${table}`, item.id);
  }

  /** Process pending mutations against Supabase. Called automatically on reconnect.
   * Groups mutations by table+type for batch efficiency.
   * Failed items get exponential backoff retry (max 3 retries). */
  async processQueue(): Promise<SyncResult> {
    if (!this._isOnline) {
      return { success: 0, failed: 0 };
    }

    const now = Date.now();
    const MAX_RETRIES = 3;
    const pending = this.queue.filter((item) =>
      !item.synced && (item.nextRetryAt === 0 || item.nextRetryAt <= now) && item.retryCount < MAX_RETRIES
    );
    if (pending.length === 0) {
      return { success: 0, failed: 0 };
    }

    console.log(`[OfflineManager] Processing ${pending.length} queued items...`);

    let success = 0;
    let failed = 0;

    // Process in parallel batches of 5 to avoid overwhelming the connection
    const BATCH_SIZE = 5;
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          const { error } = await this.executeMutation(item);
          if (error) throw error;
          return item;
        })
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === 'fulfilled') {
          result.value.synced = true;
          success++;
        } else {
          const item = batch[j];
          item.retryCount++;
          // Exponential backoff: 2s, 8s, 32s
          item.nextRetryAt = now + Math.pow(4, item.retryCount) * 500;
          console.error(`[OfflineManager] Mutation error (${item.id}), retry ${item.retryCount}/${MAX_RETRIES} at ${new Date(item.nextRetryAt).toISOString()}`);
          failed++;
        }
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

  // ── Cache Critical Data (sensitive data is encrypted) ──────────────────

  async cacheProfile(userId: string): Promise<void> {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        // SECURITY: Encrypt profile before storing in localStorage
        const encrypted = await encrypt(data);
        localStorage.setItem(STORAGE_KEYS.profile, encrypted);
        console.log('[OfflineManager] Profile cached (encrypted)');
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
        // SECURITY: Encrypt prescriptions before storing in localStorage
        const encrypted = await encrypt(data);
        localStorage.setItem(STORAGE_KEYS.prescriptions, encrypted);
        console.log('[OfflineManager] Prescriptions cached (encrypted):', data.length);
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
      this.cacheNearbyFacilities(),
    ]);
    safeSetItem(STORAGE_KEYS.lastSync, new Date().toISOString());
  }

  // ── Extended Cache: Facilities & Doctors (stale-while-revalidate) ──────

  private facilityCache: any[] | null = null;
  private facilityCacheTime = 0;
  private doctorCache: any[] | null = null;
  private doctorCacheTime = 0;
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /** Cache nearby health facilities (non-sensitive, no encryption).
   * Stores in memory + localStorage with timestamp for SWR. */
  async cacheNearbyFacilities(city?: string): Promise<void> {
    try {
      const query = supabase
        .from('health_facilities' as any)
        .select('id, name, type, latitude, longitude, address, phone, is_verified, rating, image_url')
        .eq('is_active', true)
        .limit(100);

      if (city) (query as any).eq('city', city);

      const { data } = await query;
      if (data && data.length > 0) {
        this.facilityCache = data;
        this.facilityCacheTime = Date.now();
        safeSetItem('mz_offline_facilities', data);
        safeSetItem('mz_offline_facilities_ts', String(Date.now()));
      }
    } catch (err) {
      console.warn('[OfflineManager] Failed to cache facilities:', err);
    }
  }

  /** Get cached facilities — returns in-memory cache for instant access. */
  getCachedFacilities(): any[] | null {
    if (this.facilityCache) return this.facilityCache;
    const cached = safeGetItem<any[] | null>('mz_offline_facilities', null);
    if (cached) this.facilityCache = cached;
    return cached;
  }

  /** Check if facility cache is stale (>5 min) and should be refreshed. */
  isFacilityCacheStale(): boolean {
    const ts = this.facilityCacheTime || parseInt(safeGetItem('mz_offline_facilities_ts', '0'), 10);
    return Date.now() - ts > OfflineManager.CACHE_TTL;
  }

  /** Cache top doctors with stale-while-revalidate. */
  async cacheTopDoctors(countryId?: string): Promise<void> {
    try {
      let query = supabase
        .from('doctor_profiles' as any)
        .select('id, user_id, rating, consultation_fee, is_available, medical_specialties(name, icon)')
        .eq('is_available', true)
        .order('rating', { ascending: false })
        .limit(20);

      if (countryId) (query as any).eq('country_id', countryId);

      const { data } = await (query as any);
      if (data && data.length > 0) {
        this.doctorCache = data;
        this.doctorCacheTime = Date.now();
        safeSetItem('mz_offline_doctors', data);
        safeSetItem('mz_offline_doctors_ts', String(Date.now()));
      }
    } catch (err) {
      console.warn('[OfflineManager] Failed to cache doctors:', err);
    }
  }

  /** Get cached doctors — returns in-memory cache for instant access. */
  getCachedDoctors(): any[] | null {
    if (this.doctorCache) return this.doctorCache;
    const cached = safeGetItem<any[] | null>('mz_offline_doctors', null);
    if (cached) this.doctorCache = cached;
    return cached;
  }

  /** Check if doctor cache is stale. */
  isDoctorCacheStale(): boolean {
    const ts = this.doctorCacheTime || parseInt(safeGetItem('mz_offline_doctors_ts', '0'), 10);
    return Date.now() - ts > OfflineManager.CACHE_TTL;
  }

  // ── Retrieve Cached Data (decrypts automatically) ──────────────────────

  async getCachedProfile(): Promise<Record<string, any> | null> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.profile);
      if (!raw) return null;
      return await decrypt<Record<string, any>>(raw);
    } catch {
      return null;
    }
  }

  async getCachedPrescriptions(): Promise<Record<string, any>[] | null> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.prescriptions);
      if (!raw) return null;
      return await decrypt<Record<string, any>[]>(raw);
    } catch {
      return null;
    }
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
    console.log('[OfflineManager] Cache cleared (including encrypted data)');
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
