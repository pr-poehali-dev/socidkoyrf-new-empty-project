import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import OwnerLayout from '@/components/owner/OwnerLayout';
import JournalInstruction from '@/components/owner/JournalInstruction';
import JournalSession, { Session } from '@/components/owner/JournalSession';
import { Entry } from '@/components/owner/JournalEntry';
import { fetchMemory } from '@/lib/guard';

type Item = Record<string, unknown>;
type Section = { title: string; [k: string]: unknown };

const filters = [
  { key: 'все', label: 'Всё' },
  { key: 'done', label: 'Сделано' },
  { key: 'decision', label: 'Решения' },
  { key: 'issue', label: 'Проблемы' },
  { key: 'access', label: 'Доступы' },
];

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">{children}</div>
);

const Memory = () => {
  const [data, setData] = useState<Record<string, Section> | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState('все');
  const [query, setQuery] = useState('');
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    fetchMemory()
      .then((res) => {
        setData(res.data);
        setTitles(res.sections);
      })
      .catch(() => setError(true));
  }, []);

  const sessions = (data?.journal?.sessions ?? []) as unknown as Session[];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions
      .map((s) => ({
        session: s,
        entries: s.entries.filter((e: Entry) => {
          if (filter !== 'все' && e.type !== filter) return false;
          if (!showClosed && e.status === 'закрыто') return false;
          if (!q) return true;
          return `${e.title} ${e.text ?? ''} ${e.topic ?? ''}`.toLowerCase().includes(q);
        }),
      }))
      .filter((s) => s.entries.length > 0);
  }, [sessions, filter, query, showClosed]);

  const openIssues = useMemo(
    () =>
      sessions
        .flatMap((s) => s.entries)
        .filter((e: Entry) => e.type === 'issue' && e.status !== 'закрыто').length,
    [sessions],
  );

  if (error) {
    return (
      <OwnerLayout>
        <p className="text-slate-400">Память недоступна. Обновите страницу.</p>
      </OwnerLayout>
    );
  }

  if (!data) {
    return (
      <OwnerLayout>
        <div className="flex h-64 items-center justify-center">
          <Icon name="Loader2" className="animate-spin text-slate-500" size={28} />
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Память проекта</h1>
        <p className="text-sm text-slate-500">
          Хроника работы по сеансам
          {openIssues > 0 && ` · открытых проблем: ${openIssues}`}
        </p>
      </div>

      <Tabs defaultValue="journal">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-slate-900">
          {['journal', 'plans', 'blocks', 'glossary'].map((key) => (
            <TabsTrigger key={key} value={key} className="data-[state=active]:bg-slate-800">
              {titles[key] ?? key}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="journal" className="mt-4">
          <JournalInstruction data={data.journal?.instruction as never} />

          <div className="mb-3 space-y-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по журналу"
              className="border-slate-800 bg-slate-900"
            />
            <div className="flex flex-wrap gap-1.5">
              {filters.map((f) => (
                <Button
                  key={f.key}
                  size="sm"
                  variant={filter === f.key ? 'default' : 'outline'}
                  className={
                    filter === f.key ? '' : 'border-slate-700 bg-transparent text-slate-400'
                  }
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                className={`ml-auto ${showClosed ? 'text-slate-200' : 'text-slate-500'}`}
                onClick={() => setShowClosed((v) => !v)}
              >
                <Icon name={showClosed ? 'Eye' : 'EyeOff'} className="mr-1.5" size={14} />
                Закрытые
              </Button>
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Ничего не найдено.</p>
          ) : (
            <div className="space-y-3">
              {visible.map((s, i) => (
                <JournalSession
                  key={s.session.id}
                  session={s.session}
                  entries={s.entries}
                  defaultOpen={i === 0}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="plans" className="mt-4 space-y-3">
          {((data.plans?.items ?? []) as Item[]).map((item, i) => (
            <Card key={i}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{String(item.title)}</h3>
                <span className="text-xs text-slate-500">{String(item.status)}</span>
                <span className="ml-auto text-xs text-slate-500">
                  приоритет: {String(item.priority)}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400">{String(item.details)}</p>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="blocks" className="mt-4 space-y-3">
          {((data.blocks?.items ?? []) as Item[]).map((item, i) => (
            <Card key={i}>
              <h3 className="font-medium">{String(item.name)}</h3>
              <p className="mt-1 text-sm text-slate-400">{String(item.details)}</p>
              <p className="mt-2 text-xs text-slate-500">Где: {String(item.used)}</p>
            </Card>
          ))}
          {Array.isArray(data.blocks?.planned) && (
            <Card>
              <h3 className="font-medium">Запланированные блоки</h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-400">
                {(data.blocks.planned as string[]).map((b) => (
                  <li key={b}>· {b}</li>
                ))}
              </ul>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="glossary" className="mt-4 space-y-3">
          {((data.glossary?.items ?? []) as Item[]).map((item, i) => (
            <Card key={i}>
              <h3 className="font-medium">{String(item.term)}</h3>
              <p className="mt-1 text-sm text-slate-400">{String(item.meaning)}</p>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </OwnerLayout>
  );
};

export default Memory;
