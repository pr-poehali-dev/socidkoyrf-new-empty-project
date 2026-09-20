import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { fetchMe, logout as apiLogout, TOKEN_KEY, User, SessionInfo, Identity } from '@/lib/auth';

type AuthState = {
  user: User | null;
  sessions: SessionInfo[];
  identities: Identity[];
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: (everywhere?: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await fetchMe();
    setUser(data?.user ?? null);
    setSessions(data?.sessions ?? []);
    setIdentities(data?.identities ?? []);
    setLoading(false);
  }, []);

  const signOut = useCallback(
    async (everywhere = false) => {
      await apiLogout(everywhere);
      setUser(null);
      setSessions([]);
      setIdentities([]);
    },
    [],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    let lastCheck = Date.now();

    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY) {
        lastCheck = Date.now();
        refresh();
      }
    };
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastCheck < 30000) return;
      lastCheck = Date.now();
      refresh();
    };
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, sessions, identities, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthProvider;