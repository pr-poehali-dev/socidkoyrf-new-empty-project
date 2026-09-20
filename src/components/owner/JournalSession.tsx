import { useState } from 'react';
import Icon from '@/components/ui/icon';
import JournalEntry, { Entry } from '@/components/owner/JournalEntry';

export type Session = {
  id: string;
  date: string;
  from: string;
  to: string;
  title: string;
  entries: Entry[];
};

const order = ['done', 'decision', 'issue', 'access'];
const groupTitles: Record<string, string> = {
  done: 'Сделано',
  decision: 'Решения',
  issue: 'Проблемы',
  access: 'Доступы',
};

const JournalSession = ({
  session,
  entries,
  defaultOpen,
}: {
  session: Session;
  entries: Entry[];
  defaultOpen: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);

  const grouped = order
    .map((type) => ({ type, items: entries.filter((e) => e.type === type) }))
    .filter((g) => g.items.length > 0);

  const dateLabel = new Date(session.date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span>{dateLabel}</span>
            <span>
              {session.from}—{session.to}
            </span>
            <span>· {entries.length} записей</span>
          </div>
          <h2 className="mt-1 font-medium leading-snug">{session.title}</h2>
        </div>
        <Icon
          name="ChevronDown"
          size={18}
          className={`mt-1 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-slate-800 px-4 pb-4 pt-4">
          {grouped.map((g) => (
            <div key={g.type}>
              <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                {groupTitles[g.type]} · {g.items.length}
              </h3>
              <div className="space-y-2">
                {g.items.map((e, i) => (
                  <JournalEntry key={i} entry={e} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JournalSession;
