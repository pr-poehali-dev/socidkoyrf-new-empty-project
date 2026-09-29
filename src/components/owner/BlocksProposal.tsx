import { Badge } from '@/components/ui/badge';

type Item = Record<string, unknown>;

const stateStyle: Record<string, string> = {
  есть: 'bg-emerald-500/15 text-emerald-400',
  частично: 'bg-amber-500/15 text-amber-400',
  нужен: 'bg-slate-700 text-slate-400',
};

const BlocksProposal = ({ data }: { data?: Item }) => {
  if (!data) return null;

  const excluded = data.excluded as Item | undefined;
  const open = data.open as Item | undefined;
  const chains = (data.chains ?? []) as Item[];
  const total = chains.reduce((n, c) => n + ((c.items ?? []) as Item[]).length, 0);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
        <p className="text-sm leading-relaxed text-amber-200/90">
          {String(data.description)}
        </p>
        {data.rule ? (
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Правило простоты: {String(data.rule)}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-slate-500">Всего блоков в замысле: {total}</p>
      </div>

      {chains.map((chain, ci) => (
        <div key={ci}>
          <div className="mb-2">
            <h2 className="font-medium">
              {String(chain.title)}
              <span className="ml-2 text-xs font-normal text-slate-500">
                {((chain.items ?? []) as Item[]).length}
              </span>
            </h2>
            {chain.note ? (
              <p className="text-xs text-slate-500">{String(chain.note)}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            {((chain.items ?? []) as Item[]).map((item, i) => (
              <div key={i} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{String(item.name)}</h3>
                  <Badge className={stateStyle[String(item.state)] ?? stateStyle['нужен']}>
                    {String(item.state)}
                  </Badge>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  {String(item.details)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {excluded && Array.isArray(excluded.items) && (
        <div>
          <h2 className="mb-2 font-medium">{String(excluded.title)}</h2>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <ul className="space-y-2 text-sm leading-relaxed text-slate-400">
              {(excluded.items as string[]).map((x) => (
                <li key={x}>· {x}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {open && Array.isArray(open.items) && (
        <div>
          <h2 className="mb-2 font-medium">{String(open.title)}</h2>
          <div className="rounded-lg border border-sky-500/25 bg-sky-500/5 p-4">
            <ul className="space-y-2 text-sm leading-relaxed text-sky-100/80">
              {(open.items as string[]).map((x) => (
                <li key={x}>· {x}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlocksProposal;
