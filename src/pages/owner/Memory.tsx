import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import OwnerLayout from '@/components/owner/OwnerLayout';
import ConceptView from '@/components/owner/ConceptView';
import BlocksProposal from '@/components/owner/BlocksProposal';
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

const List = ({
  title,
  items,
  ordered,
}: {
  title: string;
  items?: unknown;
  ordered?: boolean;
}) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="mt-3">
      <h4 className="text-xs uppercase tracking-wide text-slate-500">{title}</h4>
      <ul className="mt-1.5 space-y-1.5">
        {(items as string[]).map((t, i) => (
          <li key={i} className="text-sm leading-relaxed text-slate-400">
            {ordered ? `${i + 1}. ` : '· '}
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
};

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
          {['concept', 'journal', 'plans', 'blocks', 'glossary'].map((key) => (
            <TabsTrigger key={key} value={key} className="data-[state=active]:bg-slate-800">
              {titles[key] ?? key}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="concept" className="mt-4">
          <ConceptView data={data.concept as never} />
        </TabsContent>

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

        <TabsContent value="blocks" className="mt-4">
          <Tabs defaultValue="real">
            <TabsList className="mb-4 bg-slate-900">
              <TabsTrigger value="real" className="data-[state=active]:bg-slate-800">
                Что есть
              </TabsTrigger>
              <TabsTrigger value="proposal" className="data-[state=active]:bg-slate-800">
                Замысел
              </TabsTrigger>
            </TabsList>

            <TabsContent value="proposal">
              <BlocksProposal data={data.blocks?.proposal as never} />
            </TabsContent>

            <TabsContent value="real" className="space-y-5">
          {data.blocks?.description ? (
            <p className="text-sm text-slate-500">
              {String(data.blocks.description)}
              {data.blocks.checked
                ? `. Сверено по коду ${new Date(String(data.blocks.checked)).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`
                : ''}
            </p>
          ) : null}

          {((data.blocks?.groups ?? []) as Item[]).map((group, gi) => (
            <div key={gi}>
              <div className="mb-2">
                <h2 className="font-medium">
                  {String(group.title)}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    {((group.items ?? []) as Item[]).length}
                  </span>
                </h2>
                {group.note ? (
                  <p className="text-xs text-slate-500">{String(group.note)}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                {((group.items ?? []) as Item[]).map((item, i) => (
                  <Card key={i}>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{String(item.name)}</h3>
                      {item.data && item.data !== '—' ? (
                        <Badge
                          className={
                            item.data === 'общие'
                              ? 'bg-sky-500/15 text-sky-400'
                              : 'bg-violet-500/15 text-violet-400'
                          }
                        >
                          {String(item.data)} данные
                        </Badge>
                      ) : null}
                      <span className="ml-auto text-xs text-slate-500">
                        {String(item.used)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                      {String(item.details)}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {Array.isArray(data.blocks?.planned) && (
            <div>
              <h2 className="mb-2 font-medium">Запланированные блоки</h2>
              <Card>
                <ul className="space-y-1.5 text-sm text-slate-400">
                  {(data.blocks.planned as string[]).map((b) => (
                    <li key={b}>· {b}</li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="glossary" className="mt-4 space-y-3">
          {((data.glossary?.items ?? []) as Item[]).map((item, i) => (
            <Card key={i}>
              <h3 className="font-medium">{String(item.term)}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                {String(item.meaning)}
              </p>
              <List title="Как используем" items={item.modes} ordered />
              <List title="Что блоком не является" items={item.not_a_block} />
              <List title="Подробнее" items={item.details} />
              {item.note ? (
                <p className="mt-2 text-sm text-slate-400">{String(item.note)}</p>
              ) : null}
              {item.status ? (
                <p className="mt-2 text-xs text-slate-500">{String(item.status)}</p>
              ) : null}
              {item.rule ? (
                <p className="mt-3 rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-sm text-amber-200/90">
                  Правило: {String(item.rule)}
                </p>
              ) : null}
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </OwnerLayout>
  );
};

export default Memory;