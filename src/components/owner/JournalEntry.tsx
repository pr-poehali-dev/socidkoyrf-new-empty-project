import Icon from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';

export type Entry = {
  type: string;
  title: string;
  text?: string;
  status?: string;
  time?: string;
  topic?: string;
  severity?: string;
  rejected?: string;
  fix?: string;
  where?: string;
};

export const typeMeta: Record<string, { label: string; icon: string; tone: string }> = {
  done: { label: 'Сделано', icon: 'Check', tone: 'bg-emerald-500/15 text-emerald-400' },
  decision: { label: 'Решение', icon: 'Lightbulb', tone: 'bg-sky-500/15 text-sky-400' },
  issue: { label: 'Проблема', icon: 'TriangleAlert', tone: 'bg-amber-500/15 text-amber-400' },
  access: { label: 'Доступ', icon: 'KeyRound', tone: 'bg-violet-500/15 text-violet-400' },
};

const JournalEntry = ({ entry }: { entry: Entry }) => {
  const meta = typeMeta[entry.type] ?? {
    label: entry.type,
    icon: 'Circle',
    tone: 'bg-slate-500/15 text-slate-400',
  };
  const closed = entry.status === 'закрыто';

  return (
    <div
      className={`rounded-lg border border-slate-800 bg-slate-900 p-4 ${closed ? 'opacity-60' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={`${meta.tone} gap-1`}>
          <Icon name={meta.icon} size={12} />
          {meta.label}
        </Badge>
        {entry.topic && (
          <Badge variant="outline" className="border-slate-700 text-slate-400">
            {entry.topic}
          </Badge>
        )}
        {entry.status && (
          <span className={`text-xs ${closed ? 'text-emerald-400' : 'text-slate-500'}`}>
            {entry.status}
          </span>
        )}
        {entry.time && <span className="ml-auto text-xs text-slate-500">{entry.time}</span>}
      </div>

      <h3 className="mt-2 font-medium leading-snug">{entry.title}</h3>
      {entry.text && <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{entry.text}</p>}

      {entry.where && (
        <p className="mt-2 text-xs text-slate-500">Где: {entry.where}</p>
      )}
      {entry.rejected && (
        <p className="mt-2 text-xs text-slate-500">Отвергли: {entry.rejected}</p>
      )}
      {entry.fix && <p className="mt-2 text-xs text-slate-500">Решение: {entry.fix}</p>}
    </div>
  );
};

export default JournalEntry;
