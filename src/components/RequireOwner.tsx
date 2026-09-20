import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/contexts/AuthContext';
import { useGuard } from '@/contexts/GuardContext';

const RequireOwner = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { elevated, is_owner, loading } = useGuard();
  const location = useLocation();

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Icon name="Loader2" className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!elevated) return <Navigate to={`/vault?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!is_owner) return <Navigate to="/account" replace />;

  return <>{children}</>;
};

export default RequireOwner;
