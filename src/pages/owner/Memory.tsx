import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import OwnerLayout from '@/components/owner/OwnerLayout';
import { fetchMemory } from '@/lib/guard';

type Item = Record<string, unknown>;
type Section = { title: string; description?: string; items?: Item[]; [k: string]: unknown };

const order = [
  'instruction',
  'vk_setup',
  'done',
  'plans',
  'decisions',
  'blocks',
  'access',
  'issues',
  'glossary',
];

const statusTone = (value: string) => {
  const v = value.toLowerCase();
  if (v.includes('работает') || v.includes('куплен')) return 'bg-emerald-500/15 text-emerald-400';
  if (v.includes('временно') || v.includes('ждём') || v.includes('внимание'))
    return 'bg-amber-500/15 text-amber-400';
  if (v.includes('заготовка') || v.includes('идея')) return 'bg-slate-500/15 text-slate-400';
  return 'bg-sky-500/15 text-sky-400';
};

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">{children}</div>
);

const Memory = () => {
  const [data, setData] = useState<Record<string, Section> | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);
  const [topic, setTopic] = useState<string>('все');

  useEffect(() => {
    fetchMemory()
      .then((res) => {
        setData(res.data);
        setTitles(res.sections);
      })
      .catch(() => setError(true));
  }, []);

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

  const decisions = (data.decisions?.items ?? []) as Item[];
  const topics = ['все', ...Array.from(new Set(decisions.map((d) => String(d.topic))))];
  const filtered =
    topic === 'все' ? decisions : decisions.filter((d) => String(d.topic) === topic);

  return (
    <OwnerLayout>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Память проекта</h1>
        <p className="text-sm text-slate-500">Вся история, планы и решения в одном месте</p>
      </div>

      <Tabs defaultValue="instruction">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-slate-900">
          {order.map((key) => {
            const isGuide = key === 'instruction' || key === 'vk_setup';
            return (
              <TabsTrigger
                key={key}
                value={key}
                className={`data-[state=active]:bg-slate-800 ${
                  isGuide ? 'text-amber-400/90 data-[state=active]:text-amber-300' : ''
                }`}
              >
                {isGuide && <Icon name="BookOpen" className="mr-1.5" size={14} />}
                {titles[key] ?? key}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="instruction" className="mt-4 space-y-3">
          {(data.instruction?.intro as string[] | undefined)?.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-slate-400">
              {p}
            </p>
          ))}
          <div className="space-y-2">
            {(data.instruction?.sections as Item[] | undefined)?.map((s, i) => (
              <Card key={i}>
                <h3 className="font-medium">{String(s.tab)}</h3>
                <p className="mt-1 text-sm text-slate-400">{String(s.purpose)}</p>
                <p className="mt-2 text-xs text-slate-500">Кто пишет: {String(s.who_writes)}</p>
              </Card>
            ))}
          </div>
          <Card>
            <h3 className="font-medium">Правила записи</h3>
            <ol className="mt-2 space-y-1.5 text-sm text-slate-400">
              {(data.instruction?.rules as string[] | undefined)?.map((r, i) => (
                <li key={i}>
                  {i + 1}. {r}
                </li>
              ))}
            </ol>
          </Card>
          <Card>
            <h3 className="font-medium">Что можно сказать Юре</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-400">
              {(data.instruction?.how_to_use as string[] | undefined)?.map((h, i) => (
                <li key={i}>· {h}</li>
              ))}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="vk_setup" className="mt-4 space-y-3">
          <Card>
            <div className="flex items-center gap-2">
              <Icon name="TriangleAlert" className="text-amber-400" size={16} />
              <h3 className="font-medium">Важно знать до начала</h3>
            </div>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-400">
              {(data.vk_setup?.important as string[] | undefined)?.map((t, i) => (
                <li key={i}>· {t}</li>
              ))}
            </ul>
          </Card>
          {(data.vk_setup?.steps as Item[] | undefined)?.map((s, i) => (
            <Card key={i}>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs text-slate-300">
                  {String(s.step)}
                </span>
                <div className="min-w-0">
                  <h3 className="font-medium">{String(s.title)}</h3>
                  <p className="mt-1 break-words text-sm text-slate-400">{String(s.details)}</p>
                </div>
              </div>
            </Card>
          ))}
          <Card>
            <h3 className="font-medium">Если что-то пошло не так</h3>
            <div className="mt-3 space-y-3">
              {(data.vk_setup?.troubleshooting as Item[] | undefined)?.map((t, i) => (
                <div key={i}>
                  <p className="text-sm text-slate-300">{String(t.problem)}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{String(t.reason)}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="done" className="mt-4 space-y-3">
          {(data.done?.items ?? []).map((item, i) => (
            <Card key={i}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{String(item.title)}</h3>
                <Badge className={statusTone(String(item.status))}>{String(item.status)}</Badge>
                <span className="ml-auto text-xs text-slate-500">
                  {String(item.date)}
                  {item.time ? ` · ${String(item.time)}` : ''}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400">{String(item.details)}</p>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="plans" className="mt-4 space-y-3">
          {(data.plans?.items ?? []).map((item, i) => (
            <Card key={i}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{String(item.title)}</h3>
                <Badge className={statusTone(String(item.status))}>{String(item.status)}</Badge>
                <span className="ml-auto text-xs text-slate-500">
                  приоритет: {String(item.priority)}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400">{String(item.details)}</p>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="decisions" className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <Button
                key={t}
                size="sm"
                variant={topic === t ? 'default' : 'outline'}
                className={topic === t ? '' : 'border-slate-700 bg-transparent text-slate-400'}
                onClick={() => setTopic(t)}
              >
                {t}
              </Button>
            ))}
          </div>
          {filtered.map((item, i) => (
            <Card key={i}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-slate-700 text-slate-400">
                  {String(item.topic)}
                </Badge>
                <span className="ml-auto text-xs text-slate-500">{String(item.date)}</span>
              </div>
              <h3 className="mt-2 font-medium">{String(item.decision)}</h3>
              <p className="mt-2 text-sm text-slate-400">
                <span className="text-slate-500">Почему: </span>
                {String(item.why)}
              </p>
              {item.rejected ? (
                <p className="mt-1 text-sm text-slate-500">
                  Отвергли: {String(item.rejected)}
                </p>
              ) : null}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="blocks" className="mt-4 space-y-3">
          {(data.blocks?.items ?? []).map((item, i) => (
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

        <TabsContent value="access" className="mt-4 space-y-3">
          {(data.access?.items ?? []).map((item, i) => (
            <Card key={i}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{String(item.service)}</h3>
                <Badge className={statusTone(String(item.status))}>{String(item.status)}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-500">Где: {String(item.where)}</p>
              <p className="mt-2 text-sm text-slate-400">{String(item.note)}</p>
            </Card>
          ))}
          {data.access?.elevation ? (
            <Card>
              <h3 className="font-medium">
                {String((data.access.elevation as Item).title)}
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Сейчас: {String((data.access.elevation as Item).now)}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Дальше: {String((data.access.elevation as Item).next)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Порядок: {String((data.access.elevation as Item).order)}
              </p>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="issues" className="mt-4 space-y-3">
          {(data.issues?.items ?? []).map((item, i) => (
            <Card key={i}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{String(item.title)}</h3>
                <Badge className={statusTone(String(item.severity))}>
                  {String(item.severity)}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-slate-400">{String(item.details)}</p>
              <p className="mt-2 text-xs text-slate-500">Решение: {String(item.fix)}</p>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="glossary" className="mt-4 space-y-3">
          {(data.glossary?.items ?? []).map((item, i) => (
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