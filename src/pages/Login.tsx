import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { startVkLogin } from '@/lib/auth';

const Login = () => {
  const { user, loading } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Icon name="Loader2" className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  if (user) return <Navigate to="/account" replace />;

  const handleVk = async () => {
    setBusy(true);
    try {
      const url = await startVkLogin();
      window.location.href = url;
    } catch {
      toast.error('Не удалось начать вход. Попробуйте ещё раз.');
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Вход</CardTitle>
          <CardDescription>Без паролей и кодов — один тап</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Button
            onClick={handleVk}
            disabled={!agreed || busy}
            className="h-12 w-full bg-[#0077FF] text-white hover:bg-[#0066DD]"
          >
            {busy ? (
              <Icon name="Loader2" className="mr-2 animate-spin" size={20} />
            ) : (
              <Icon name="LogIn" className="mr-2" size={20} />
            )}
            Войти через ВКонтакте
          </Button>

          <div className="space-y-2 opacity-50">
            <Button disabled variant="outline" className="h-12 w-full">
              Яндекс — скоро
            </Button>
            <Button disabled variant="outline" className="h-12 w-full">
              Telegram — скоро
            </Button>
          </div>

          <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              className="mt-0.5"
            />
            <span>
              Соглашаюсь с{' '}
              <Link to="/privacy" className="text-primary underline" target="_blank">
                политикой конфиденциальности
              </Link>{' '}
              и обработкой персональных данных
            </span>
          </label>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
