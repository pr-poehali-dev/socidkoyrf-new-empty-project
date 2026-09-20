import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { fetchGuardStatus, elevate as apiElevate, dropElevation, GuardStatus } from '@/lib/guard';
import { useAuth } from '@/contexts/AuthContext';

type GuardState = GuardStatus & {
  loading: boolean;
  refresh: () => Promise<void>;
  passSecondStep: () => Promise<void>;
  drop: () => Promise<void>;
};

const empty: GuardStatus = {
  authenticated: false,
  elevated: false,
  is_owner: false,
  owner_candidate: false,
  elevated_until: null,
};

const GuardContext = createContext<GuardState | undefined>(undefined);

export const GuardProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<GuardStatus>(empty);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setStatus(empty);
      setLoading(false);
      return;
    }
    setLoading(true);
    setStatus(await fetchGuardStatus());
    setLoading(false);
  }, [user]);

  const passSecondStep = useCallback(async () => {
    setStatus(await apiElevate());
  }, []);

  const drop = useCallback(async () => {
    await dropElevation();
    setStatus((s) => ({ ...s, elevated: false, is_owner: false, elevated_until: null }));
  }, []);

  useEffect(() => {
    if (!authLoading) refresh();
  }, [authLoading, refresh]);

  return (
    <GuardContext.Provider value={{ ...status, loading: loading || authLoading, refresh, passSecondStep, drop }}>
      {children}
    </GuardContext.Provider>
  );
};

export const useGuard = () => {
  const ctx = useContext(GuardContext);
  if (!ctx) throw new Error('useGuard must be used within GuardProvider');
  return ctx;
};

export default GuardProvider;