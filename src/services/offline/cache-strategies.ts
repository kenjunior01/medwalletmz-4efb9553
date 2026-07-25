// =============================================================================
// MedWallet — Cache Strategies for Offline-First PWA
// =============================================================================
// Defines three caching strategies and per-data-type expiry times.
// These strategies wrap fetch-like patterns for use with OfflineManager.
//
// Strategies:
//   - NetworkFirst:    Try network, fallback to cache (dynamic data)
//   - CacheFirst:      Try cache, update in background (static data)
//   - StaleWhileRevalidate: Show cached immediately, update silently (wallet)
// =============================================================================

// ── Types ────────────────────────────────────────────────────────────────────────

/** Metadata stored alongside every cached entry in IndexedDB / localStorage. */
export interface CacheEntry<T = unknown> {
  /** The cached payload */
  data: T;
  /** ISO timestamp when this entry was written */
  cachedAt: string;
  /** TTL in milliseconds — data is considered stale after cachedAt + ttl */
  ttl: number;
  /** Cache key this entry belongs to */
  key: string;
}

/** Result returned by all strategy handlers. */
export interface StrategyResult<T = unknown> {
  /** The resolved data (from network or cache) */
  data: T | null;
  /** Whether the data came from the cache (stale or fresh) */
  fromCache: boolean;
  /** Whether the data was refreshed from the network in the background */
  backgroundRefreshed: boolean;
  /** Cache hit (even if stale) */
  cacheHit: boolean;
}

/** Descriptor for a cacheable data type. */
export interface CacheTypeDescriptor {
  /** Unique storage key prefix (e.g. 'mz_cache_appointments') */
  key: string;
  /** Default TTL in milliseconds */
  defaultTtl: number;
  /** Which strategy to use by default */
  strategy: CacheStrategyName;
  /** Human-readable label for debugging / logging */
  label: string;
}

export type CacheStrategyName = 'network-first' | 'cache-first' | 'stale-while-revalidate';

/** Context passed to strategy handlers. */
export interface StrategyContext<T = unknown> {
  /** Storage key */
  key: string;
  /** TTL override (optional) */
  ttl?: number;
  /** Fetch function — must return the data or throw */
  fetcher: () => Promise<T>;
  /** Function to read from the cache store */
  getFromCache: (key: string) => Promise<CacheEntry<T> | null>;
  /** Function to write to the cache store */
  setToCache: (entry: CacheEntry<T>) => Promise<void>;
}

// ── Cache Expiry Configuration ───────────────────────────────────────────────────

/**
 * Time-to-live constants per data type.
 * Shorter TTL for rapidly-changing data, longer for relatively static data.
 */
export const CACHE_TTL = {
  /** 2 minutes — wallet balance changes frequently */
  WALLET_BALANCE: 2 * 60 * 1000,
  /** 5 minutes — upcoming appointments may change */
  APPOINTMENTS: 5 * 60 * 1000,
  /** 10 minutes — prescriptions don't change often */
  PRESCRIPTIONS: 10 * 60 * 1000,
  /** 30 minutes — user profile changes rarely */
  PROFILE: 30 * 60 * 1000,
  /** 1 hour — country/province metadata is very stable */
  COUNTRY_INFO: 60 * 60 * 1000,
  /** 24 hours — static reference data (medications, specialties, etc.) */
  REFERENCE_DATA: 24 * 60 * 60 * 1000,
  /** 1 week — images and assets */
  ASSETS: 7 * 24 * 60 * 60 * 1000,
} as const;

// ── Cache Type Registry ──────────────────────────────────────────────────────────

/**
 * Registry of known cacheable data types with their descriptors.
 * Used by OfflineManager to auto-configure caching behaviour.
 */
export const CACHE_TYPES: Record<string, CacheTypeDescriptor> = {
  profile: {
    key: 'mz_cache_profile',
    defaultTtl: CACHE_TTL.PROFILE,
    strategy: 'network-first',
    label: 'User Profile',
  },
  prescriptions: {
    key: 'mz_cache_prescriptions',
    defaultTtl: CACHE_TTL.PRESCRIPTIONS,
    strategy: 'network-first',
    label: 'Prescriptions',
  },
  appointments: {
    key: 'mz_cache_appointments',
    defaultTtl: CACHE_TTL.APPOINTMENTS,
    strategy: 'network-first',
    label: 'Appointments',
  },
  wallet_balance: {
    key: 'mz_cache_wallet',
    defaultTtl: CACHE_TTL.WALLET_BALANCE,
    strategy: 'stale-while-revalidate',
    label: 'Wallet Balance',
  },
  country_info: {
    key: 'mz_cache_country_info',
    defaultTtl: CACHE_TTL.COUNTRY_INFO,
    strategy: 'cache-first',
    label: 'Country Info',
  },
  reference_data: {
    key: 'mz_cache_reference',
    defaultTtl: CACHE_TTL.REFERENCE_DATA,
    strategy: 'cache-first',
    label: 'Reference Data',
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────────

/** Check if a cache entry has expired. */
export function isCacheEntryExpired<T>(entry: CacheEntry<T>): boolean {
  const age = Date.now() - new Date(entry.cachedAt).getTime();
  return age > entry.ttl;
}

/** Create a new cache entry with metadata. */
export function createCacheEntry<T>(key: string, data: T, ttl: number): CacheEntry<T> {
  return {
    data,
    cachedAt: new Date().toISOString(),
    ttl,
    key,
  };
}

// ── Strategy Implementations ──────────────────────────────────────────────────────────────

/**
 * NetworkFirst: Attempt the network request. If it fails (offline/error),
 * fall back to cached data. Best for dynamic data that should be fresh.
 *
 * Use for: appointments, prescriptions, profile
 */
export async function networkFirst<T>(ctx: StrategyContext<T>): Promise<StrategyResult<T>> {
  const cached = await ctx.getFromCache(ctx.key);

  // Try network first
  try {
    const data = await ctx.fetcher();
    const entry = createCacheEntry(ctx.key, data, ctx.ttl ?? CACHE_TTL.PROFILE);
    await ctx.setToCache(entry);
    console.log(`[CacheStrategy:NetworkFirst] Fresh data for '${ctx.key}'`);
    return { data, fromCache: false, backgroundRefreshed: false, cacheHit: false };
  } catch (networkErr) {
    console.warn(`[CacheStrategy:NetworkFirst] Network failed for '${ctx.key}', trying cache...`, networkErr);

    if (cached) {
      const expired = isCacheEntryExpired(cached);
      console.log(`[CacheStrategy:NetworkFirst] Cache ${expired ? 'STALE' : 'FRESH'} hit for '${ctx.key}'`);
      return { data: cached.data, fromCache: true, backgroundRefreshed: false, cacheHit: true };
    }

    console.warn(`[CacheStrategy:NetworkFirst] No cache available for '${ctx.key}'`);
    return { data: null, fromCache: false, backgroundRefreshed: false, cacheHit: false };
  }
}

/**
 * CacheFirst: Try to serve from cache immediately. If the cache is empty
 * or expired, go to the network. After a successful network fetch, update
 * the cache silently.
 *
 * Use for: country info, reference data (specialties, medications list)
 */
export async function cacheFirst<T>(ctx: StrategyContext<T>): Promise<StrategyResult<T>> {
  const cached = await ctx.getFromCache(ctx.key);

  // If we have fresh cached data, serve it immediately
  if (cached && !isCacheEntryExpired(cached)) {
    console.log(`[CacheStrategy:CacheFirst] Fresh cache hit for '${ctx.key}'`);
    return { data: cached.data, fromCache: true, backgroundRefreshed: false, cacheHit: true };
  }

  // No fresh cache — try network
  try {
    const data = await ctx.fetcher();
    const entry = createCacheEntry(ctx.key, data, ctx.ttl ?? CACHE_TTL.COUNTRY_INFO);
    await ctx.setToCache(entry);
    console.log(`[CacheStrategy:CacheFirst] Fetched & cached '${ctx.key}'`);
    return { data, fromCache: false, backgroundRefreshed: false, cacheHit: false };
  } catch (networkErr) {
    console.warn(`[CacheStrategy:CacheFirst] Network failed for '${ctx.key}'`, networkErr);

    // Even if expired, serve stale data as last resort
    if (cached) {
      console.log(`[CacheStrategy:CacheFirst] Serving STALE cache for '${ctx.key}'`);
      return { data: cached.data, fromCache: true, backgroundRefreshed: false, cacheHit: true };
    }

    return { data: null, fromCache: false, backgroundRefreshed: false, cacheHit: false };
  }
}

/**
 * StaleWhileRevalidate: Serve cached data immediately (even if stale),
 * then fetch fresh data from the network in the background and update cache.
 *
 * Use for: wallet balance (show cached amount fast, update when possible)
 */
export async function staleWhileRevalidate<T>(ctx: StrategyContext<T>): Promise<StrategyResult<T>> {
  const cached = await ctx.getFromCache(ctx.key);

  // If we have any cached data, serve it immediately
  if (cached) {
    console.log(`[CacheStrategy:SWR] Serving cached '${ctx.key}' (age: ${Math.round((Date.now() - new Date(cached.cachedAt).getTime()) / 1000)}s)`);

    // Fire-and-forget background refresh
    ctx.fetcher()
      .then(async (freshData) => {
        const entry = createCacheEntry(ctx.key, freshData, ctx.ttl ?? CACHE_TTL.WALLET_BALANCE);
        await ctx.setToCache(entry);
        console.log(`[CacheStrategy:SWR] Background refresh complete for '${ctx.key}'`);
      })
      .catch((err) => {
        console.warn(`[CacheStrategy:SWR] Background refresh failed for '${ctx.key}'`, err);
      });

    return { data: cached.data, fromCache: true, backgroundRefreshed: false, cacheHit: true };
  }

  // No cache at all — must go to network
  try {
    const data = await ctx.fetcher();
    const entry = createCacheEntry(ctx.key, data, ctx.ttl ?? CACHE_TTL.WALLET_BALANCE);
    await ctx.setToCache(entry);
    console.log(`[CacheStrategy:SWR] Initial fetch & cache for '${ctx.key}'`);
    return { data, fromCache: false, backgroundRefreshed: false, cacheHit: false };
  } catch (networkErr) {
    console.warn(`[CacheStrategy:SWR] Network failed for '${ctx.key}'`, networkErr);
    return { data: null, fromCache: false, backgroundRefreshed: false, cacheHit: false };
  }
}

// ── Strategy Router ───────────────────────────────────────────────────────────────

/**
 * Execute the appropriate cache strategy based on the strategy name.
 */
export async function executeStrategy<T>(
  strategy: CacheStrategyName,
  ctx: StrategyContext<T>,
): Promise<StrategyResult<T>> {
  switch (strategy) {
    case 'network-first':
      return networkFirst(ctx);
    case 'cache-first':
      return cacheFirst(ctx);
    case 'stale-while-revalidate':
      return staleWhileRevalidate(ctx);
    default: {
      const _exhaustive: never = strategy;
      console.warn(`[CacheStrategy] Unknown strategy: ${_exhaustive}, falling back to network-first`);
      return networkFirst(ctx);
    }
  }
}

/**
 * Convenience: build a StrategyContext from a cache type name.
 */
export function buildContext<T>(
  typeName: string,
  fetcher: () => Promise<T>,
  getFromCache: (key: string) => Promise<CacheEntry<T> | null>,
  setToCache: (entry: CacheEntry<T>) => Promise<void>,
  ttlOverride?: number,
): StrategyContext<T> | null {
  const descriptor = CACHE_TYPES[typeName];
  if (!descriptor) {
    console.warn(`[CacheStrategy] Unknown cache type: '${typeName}'`);
    return null;
  }

  return {
    key: descriptor.key,
    ttl: ttlOverride ?? descriptor.defaultTtl,
    fetcher,
    getFromCache,
    setToCache,
  };
}
