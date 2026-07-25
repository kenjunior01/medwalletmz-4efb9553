import { useState, useEffect, useCallback } from 'react';
import { offlineManager } from '@/services/offline/OfflineManager';

// =============================================================================
// useOfflineMode — React hook for offline mode state
// =============================================================================
// Wraps OfflineManager singleton into reactive state.
// Provides online/offline status, queue size, and sync trigger.
// =============================================================================

interface OfflineModeState {
  /** Whether the device has network connectivity */
  isOnline: boolean;
  /** Number of items pending sync in the queue */
  queueSize: number;
  /** Whether a sync is currently in progress */
  isSyncing: boolean;
  /** Last sync timestamp (null if never synced) */
  lastSyncTime: Date | null;
  /** Manually trigger queue processing */
  syncNow: () => Promise<{ success: number; failed: number }>;
  /** Shorthand: get cached profile data */
  getCachedProfile: () => Record<string, any> | null;
  /** Shorthand: get cached prescriptions */
  getCachedPrescriptions: () => Record<string, any>[] | null;
  /** Shorthand: get cached wallet balance */
  getCachedWalletBalance: () => number | null;
}

export function useOfflineMode(): OfflineModeState {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [queueSize, setQueueSize] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Initialize the OfflineManager singleton on first mount
  useEffect(() => {
    offlineManager.init();
    setQueueSize(offlineManager.getQueueSize());
    setLastSyncTime(offlineManager.getLastSyncTime());
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // processQueue will be called by OfflineManager internally,
      // but we also update UI state via syncNow
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncNow = useCallback(async () => {
    if (isSyncing) return { success: 0, failed: 0 };
    setIsSyncing(true);
    try {
      const result = await offlineManager.processQueue();
      setQueueSize(offlineManager.getQueueSize());
      setLastSyncTime(offlineManager.getLastSyncTime());
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  const getCachedProfile = useCallback(() => {
    return offlineManager.getCachedProfile();
  }, []);

  const getCachedPrescriptions = useCallback(() => {
    return offlineManager.getCachedPrescriptions();
  }, []);

  const getCachedWalletBalance = useCallback(() => {
    return offlineManager.getCachedWalletBalance();
  }, []);

  return {
    isOnline,
    queueSize,
    isSyncing,
    lastSyncTime,
    syncNow,
    getCachedProfile,
    getCachedPrescriptions,
    getCachedWalletBalance,
  };
}
