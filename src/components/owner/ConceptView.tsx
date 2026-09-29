import Icon from '@/components/ui/icon';

type Item = Record<string, unknown>;

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">{children}</div>
);

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h2 className="mb-2 font-medium">{title}</h2>
    {children}
  </div>
);

const ConceptView = ({ data }: { data?: Item }) => {
  if (!data) return null;

  const flow = data.flow as Item | undefined;
  const trust = data.trust as Item | undefined;
  const auth = data.auth as Item | undefined;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-4">
        <p className="text-lg font-medium text-emerald-300">{String(data.slogan)}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{String(data.essence)}</p>
      </div>

      {Array.isArray(data.problems) && (
        <Group title="Какую проблему решаем">
          <div className="space-y-2">
            {(data.problems as Item[]).map((p, i) => (
              <Card key={i}>
                <h3 className="text-sm font-medium text-slate-300">{String(p.who)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{String(p.pain)}</p>
              </Card>
            ))}
          </div>
        </Group>
      )}

      {flow && Array.isArray(flow.steps) && (
        <Group title={String(flow.title)}>
          <Card>
            <ol className="space-y-2.5">
              {(flow.steps as string[]).map((s, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-400">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs text-slate-300">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </Card>
        </Group>
      )}

      {trust && Array.isArray(trust.items) && (
        <Group title={String(trust.title)}>
          <div className="space-y-2">
            {(trust.items as Item[]).map((t, i) => (
              <Card key={i}>
                <h3 className="font-medium">{String(t.name)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  {String(t.details)}
                </p>
              </Card>
            ))}
          </div>
        </Group>
      )}

      {auth && (
        <Group title={String(auth.title)}>
          <Card>
            <p className="text-sm leading-relaxed text-slate-400">{String(auth.why)}</p>
            {Array.isArray(auth.planned) && (
              <ul className="mt-3 space-y-1.5">
                {(auth.planned as string[]).map((a) => (
                  <li key={a} className="text-sm text-slate-400">
                    · {a}
                  </li>
                ))}
              </ul>
            )}
            {auth.note ? (
              <p className="mt-3 text-xs text-slate-500">{String(auth.note)}</p>
            ) : null}
          </Card>
        </Group>
      )}

      {Array.isArray(data.roles) && (
        <Group title="Кто участвует">
          <div className="space-y-2">
            {(data.roles as Item[]).map((r, i) => (
              <Card key={i}>
                <h3 className="font-medium">{String(r.name)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  {String(r.details)}
                </p>
                {r.note ? (
                  <p className="mt-2 text-xs text-slate-500">{String(r.note)}</p>
                ) : null}
              </Card>
            ))}
          </div>
        </Group>
      )}

      {Array.isArray(data.why_works) && (
        <Group title="Почему это взлетит">
          <Card>
            <ul className="space-y-2">
              {(data.why_works as string[]).map((w, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-400">
                  <Icon name="Check" size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                  {w}
                </li>
              ))}
            </ul>
          </Card>
        </Group>
      )}

      {data.rule_for_yura ? (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3">
          <p className="text-sm leading-relaxed text-amber-200/90">
            Правило для Юры: {String(data.rule_for_yura)}
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default ConceptView;
