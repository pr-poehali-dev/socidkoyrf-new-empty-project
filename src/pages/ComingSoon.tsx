import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { joinWaitlist } from '@/lib/auth';
import { toast } from 'sonner';

type Props = {
  pass: string;
  alreadyInWaitlist: boolean;
  userName?: string;
};

const ComingSoon = ({ pass, alreadyInWaitlist, userName }: Props) => {
  const [joined, setJoined] = useState(alreadyInWaitlist);
  const [busy, setBusy] = useState(false);

  const handleJoin = async () => {
    setBusy(true);
    try {
      await joinWaitlist(pass);
      setJoined(true);
    } catch {
      toast.error('Не получилось записаться. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg space-y-8 text-center">
        <div className="space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Icon name="Hammer" className="text-primary" size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Идёт создание сервиса</h1>
          <p className="text-muted-foreground">
            {userName ? `${userName}, мы` : 'Мы'} строим сервис взаимовыгодных продаж.
            Сейчас он закрыт для входа.
          </p>
        </div>

        <div className="rounded-2xl border bg-background px-6 py-8">
          <p className="text-2xl font-semibold leading-snug text-primary">
            Всё самое лучшее впереди!
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            О дате запуска сможете узнать позднее
          </p>
        </div>

        <div className="space-y-3">
          {joined ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-4 text-primary">
              <Icon name="Check" size={20} />
              <span className="font-medium">Вы в списке — сообщим о запуске</span>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Хотите узнать о запуске первым? Нажмите кнопку — и мы сообщим
              </p>
              <Button onClick={handleJoin} disabled={busy} className="h-12 w-full text-base">
                {busy ? (
                  <Icon name="Loader2" className="mr-2 animate-spin" size={20} />
                ) : (
                  <Icon name="Bell" className="mr-2" size={20} />
                )}
                Сообщить мне о запуске
              </Button>
            </>
          )}

          <Button asChild variant="ghost" className="w-full">
            <Link to="/">На главную</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;