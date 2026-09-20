import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { useAuth } from '@/contexts/AuthContext';

const steps = [
  {
    icon: 'Search',
    title: 'Находите',
    text: 'Товары со скидками от проверенных поставщиков в одном месте',
  },
  {
    icon: 'ShoppingBag',
    title: 'Оформляете',
    text: 'Без паролей и долгих форм — вход в один тап через соцсеть',
  },
  {
    icon: 'PackageCheck',
    title: 'Получаете',
    text: 'Отслеживаете заказ и историю покупок в личном кабинете',
  },
];

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b bg-gradient-to-b from-primary/5 to-transparent">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
            <h1 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
              Выгодные покупки без лишних движений
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              Собираем товары со скидками от поставщиков. Без паролей, без спама, без навязчивых
              рассылок.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-8">
                <Link to={user ? '/account' : '/login'}>
                  {user ? 'В личный кабинет' : 'Начать'}
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-semibold">Как это работает</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.title} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Icon name={s.icon} className="text-primary" size={22} />
                </div>
                <h3 className="mt-4 font-medium">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-2xl font-semibold">Предложения</h2>
            <div className="mt-8 rounded-xl border border-dashed bg-background p-12 text-center">
              <Icon name="PackageOpen" className="mx-auto text-muted-foreground" size={36} />
              <p className="mt-4 font-medium">Скоро здесь появятся первые товары</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Подключаем поставщиков. Зарегистрируйтесь сейчас — и узнаете о скидках первым.
              </p>
              {!user && (
                <Button asChild variant="outline" className="mt-6">
                  <Link to="/login">Зарегистрироваться</Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;