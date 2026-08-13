/**
 * useUserType — React hook to read + manage the primary user type
 *
 * Usage:
 *   const { userType, setUserType, loading } = useUserType();
 *   if (userType === 'rider') { ... show rider dashboard ... }
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserType, getUserType, setUserType as persistUserType } from '@/services/userTypes';

import { logger } from '@/lib/logger';
export function useUserType() {
  const { user } = useAuth();
  const [userType, setUserTypeState] = useState<UserType>('patient');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setUserTypeState('patient');
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = await getUserType(user.id);
    setUserTypeState(t);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const setUserType = useCallback(async (type: UserType) => {
    if (!user?.id) return;
    setUserTypeState(type); // optimistic
    try {
      await persistUserType(user.id, type);
    } catch (e) {
      logger.error('Failed to persist user type', { error: e });
      // revert on failure
      const previous = await getUserType(user.id);
      setUserTypeState(previous);
    }
  }, [user?.id]);

  return { userType, setUserType, loading, reload: load };
}

/** Quick type guards */
export function isPatient(type: UserType) { return type === 'patient'; }
export function isHealthWorker(type: UserType) { return type === 'health_worker'; }
export function isRider(type: UserType) { return type === 'rider'; }
export function isPromoter(type: UserType) { return type === 'promoter'; }
