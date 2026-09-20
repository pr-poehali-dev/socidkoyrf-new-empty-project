import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useGuard } from '@/contexts/GuardContext';

const Vault = () => {
  const { user, loading: authLoading } = useAuth();
  const { elevated, loading, passSecondStep } = useGuard();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const next = params.get('next') || '/account';

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Icon name="Loader2" className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (elevated) return <Navigate to={next} replace />;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await passSecondStep();
      navigate(next, { replace: true });
    } catch {
      toast.error('Не удалось подтвердить. Попробуйте ещё раз.');
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Icon name="ShieldCheck" className="text-primary" size={24} />
          </div>
          <CardTitle className="text-xl">Подтвердите, что это вы</CardTitle>
          <CardDescription>
            Дальше — важные данные. Подтверждение действует 30 минут.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleConfirm} disabled={busy} className="h-12 w-full">
            {busy && <Icon name="Loader2" className="mr-2 animate-spin" size={18} />}
            Это я, продолжить
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => navigate('/account')}>
            Назад в кабинет
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Скоро здесь появится код подтверждения в Telegram
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Vault;
