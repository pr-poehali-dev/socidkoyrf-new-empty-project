import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { completeVkLogin, type ClosedResult } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import ComingSoon from '@/pages/ComingSoon';

const AuthCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState<ClosedResult | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = params.get('code');
    const state = params.get('state');
    const deviceId = params.get('device_id') || '';

    if (params.get('error') || !code || !state) {
      setError('Вход отменён или прерван.');
      return;
    }

    completeVkLogin(code, state, deviceId)
      .then(async (data) => {
        if (data.closed) {
          setClosed(data as ClosedResult);
          return;
        }
        await refresh();
        navigate('/account', { replace: true });
      })
      .catch(() => setError('Не удалось завершить вход. Попробуйте ещё раз.'));
  }, [params, navigate, refresh]);

  if (closed) {
    return (
      <ComingSoon
        pass={closed.pass}
        alreadyInWaitlist={closed.already_in_waitlist}
        userName={closed.user?.name}
      />
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
        <Icon name="CircleAlert" className="text-destructive" size={40} />
        <p className="text-muted-foreground">{error}</p>
        <Button asChild>
          <Link to="/login">Вернуться ко входу</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Icon name="Loader2" className="animate-spin text-primary" size={40} />
      <p className="text-muted-foreground">Входим…</p>
    </div>
  );
};

export default AuthCallback;