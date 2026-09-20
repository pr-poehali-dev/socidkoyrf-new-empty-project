import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import OwnerLayout from '@/components/owner/OwnerLayout';
import { fetchOwnerLog, OwnerLogEntry } from '@/lib/guard';

const actionNames: Record<string, string> = {
  elevate: 'Пройден второй вход',
  drop_elevation: 'Панель закрыта',
  read_memory: 'Открыта память',
};

const OwnerLog = () => {
  const [entries, setEntries] = useState<OwnerLogEntry[] | null>(null);

  useEffect(() => {
    fetchOwnerLog().then(setEntries);
  }, []);

  return (
    <OwnerLayout>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Журнал владельца</h1>
        <p className="text-sm text-slate-500">
          Только дозапись — изменить или удалить записи нельзя
        </p>
      </div>

      {!entries ? (
        <div className="flex h-40 items-center justify-center">
          <Icon name="Loader2" className="animate-spin text-slate-500" size={24} />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-slate-500">Записей пока нет.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3"
            >
              <span className="text-sm">{actionNames[e.action] ?? e.action}</span>
              {e.target && <span className="text-xs text-slate-500">· {e.target}</span>}
              <span className="ml-auto text-xs text-slate-500">
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
    </OwnerLayout>
  );
};

export default OwnerLog;
