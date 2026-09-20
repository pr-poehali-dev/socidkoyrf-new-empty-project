import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useGuard } from '@/contexts/GuardContext';

const menu = [
  { to: '/owner/memory', label: 'Память', icon: 'BrainCircuit' },
  { to: '/owner/waitlist', label: 'Список ожидания', icon: 'Bell' },
  { to: '/owner/users', label: 'Пользователи', icon: 'Users' },
  { to: '/owner/products', label: 'Товары', icon: 'Package' },
  { to: '/owner/log', label: 'Журнал', icon: 'ScrollText' },
  { to: '/owner/settings', label: 'Настройки', icon: 'Settings' },
];

const OwnerLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { drop, elevated_until } = useGuard();
  const [open, setOpen] = useState(false);

  const handleLock = async () => {
    await drop();
    navigate('/account', { replace: true });
  };

  const until = elevated_until
    ? new Date(elevated_until).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 border-r border-slate-800 bg-slate-900 p-4 transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 flex items-center gap-2 px-2">
          <Icon name="Command" className="text-primary" size={20} />
          <span className="font-semibold">Панель</span>
        </div>
        <nav className="space-y-1">
          {menu.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-4 bottom-4 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-400 hover:text-slate-100"
            onClick={handleLock}
          >
            <Icon name="Lock" className="mr-2" size={16} />
            Закрыть панель
          </Button>
          <Link
            to="/"
            className="block px-3 text-xs text-slate-500 transition-colors hover:text-slate-300"
          >
            На сайт
          </Link>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
          >
            <Icon name="Menu" size={20} />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-slate-500">
              Владелец{until && ` · доступ до ${until}`}
            </p>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default OwnerLayout;