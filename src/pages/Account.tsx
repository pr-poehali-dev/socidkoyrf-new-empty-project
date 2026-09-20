import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useGuard } from '@/contexts/GuardContext';
import { deleteAccount } from '@/lib/auth';

const providerNames: Record<string, string> = {
  vk: 'ВКонтакте',
  yandex: 'Яндекс',
  telegram: 'Telegram',
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

const shortDevice = (ua: string) => {
  if (!ua) return 'Неизвестное устройство';
  if (/iPhone|iPad/i.test(ua)) return 'iPhone / iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Mac OS/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows';
  return 'Другое устройство';
};

const Account = () => {
  const { user, sessions, identities, signOut } = useAuth();
  const { owner_candidate } = useGuard();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const handleSignOut = async (everywhere: boolean) => {
    setBusy(true);
    await signOut(everywhere);
    navigate('/login', { replace: true });
  };

  const handleDelete = async () => {
    setBusy(true);
    await deleteAccount();
    await signOut();
    toast.success('Аккаунт удалён');
    navigate('/', { replace: true });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 py-10">
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
            <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold">{user.name}</h1>
            <Badge variant="secondary" className="mt-1">
              Покупатель
            </Badge>
          </div>
        </CardContent>
      </Card>

      {owner_candidate && (
        <Button
          className="h-12 w-full bg-slate-900 text-white hover:bg-slate-800"
          onClick={() => navigate('/owner/memory')}
        >
          <Icon name="Command" className="mr-2" size={18} />
          Пространство
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Способы входа</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {identities.map((i) => (
            <div key={i.provider} className="flex items-center justify-between text-sm">
              <span>{providerNames[i.provider] ?? i.provider}</span>
              <span className="text-muted-foreground">с {formatDate(i.created_at)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Активные входы</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate">{shortDevice(s.device)}</span>
                  {s.current && (
                    <Badge variant="outline" className="shrink-0">
                      сейчас
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(s.last_seen_at)}</p>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => handleSignOut(true)}
          >
            <Icon name="LogOut" className="mr-2" size={16} />
            Выйти на всех устройствах
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <Button variant="secondary" disabled={busy} onClick={() => handleSignOut(false)}>
          Выйти
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="text-destructive hover:text-destructive">
              Удалить аккаунт
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить аккаунт?</AlertDialogTitle>
              <AlertDialogDescription>
                Доступ будет закрыт на всех устройствах. Восстановить аккаунт будет нельзя.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Удалить</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button variant="link" asChild className="text-muted-foreground">
          <Link to="/">На главную</Link>
        </Button>
      </div>
    </div>
  );
};

export default Account;