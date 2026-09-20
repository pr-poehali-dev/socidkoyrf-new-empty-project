import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import OwnerLayout from '@/components/owner/OwnerLayout';
import { fetchWaitlist, WaitlistData } from '@/lib/guard';

const Waitlist = () => {
  const [data, setData] = useState<WaitlistData | null>(null);

  useEffect(() => {
    fetchWaitlist().then(setData);
  }, []);

  return (
    <OwnerLayout>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Список ожидания</h1>
        <p className="text-sm text-slate-500">Кто попросил сообщить о запуске</p>
      </div>

      {!data ? (
        <div className="flex h-40 items-center justify-center">
          <Icon name="Loader2" className="animate-spin text-slate-500" size={24} />
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
              <p className="text-2xl font-semibold">{data.total}</p>
              <p className="text-xs text-slate-500">в списке ожидания</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
              <p className="text-2xl font-semibold">{data.attempts}</p>
              <p className="text-xs text-slate-500">попыток входа всего</p>
            </div>
          </div>

          {data.entries.length === 0 ? (
            <p className="text-sm text-slate-500">Пока никто не записался.</p>
          ) : (
            <div className="space-y-2">
              {data.entries.map((e) => (
                <div
                  key={e.vk_id}
                  className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3"
                >
                  {e.avatar ? (
                    <img
                      src={e.avatar}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800">
                      <Icon name="User" size={16} className="text-slate-500" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{e.name || 'Без имени'}</p>
                    <a
                      href={`https://vk.com/id${e.vk_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-slate-500 hover:text-slate-300"
                    >
                      vk.com/id{e.vk_id}
                    </a>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">
                    {new Date(e.created_at).toLocaleString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </OwnerLayout>
  );
};

export default Waitlist;
