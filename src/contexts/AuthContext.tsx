import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { fetchMe, logout as apiLogout, User, SessionInfo, Identity } from '@/lib/auth';

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
