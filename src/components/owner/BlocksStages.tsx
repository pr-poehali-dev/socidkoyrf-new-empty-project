import { useState } from 'react';
import Icon from '@/components/ui/icon';

type Item = Record<string, unknown>;

const StageCard = ({ item, defaultOpen }: { item: Item; defaultOpen: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  const done = item.state === 'сделано';
  const fact = (item.fact ?? []) as string[];

  return (
    <div
      className={`rounded-lg border bg-slate-900 ${
        done ? 'border-emerald-500/30' : 'border-slate-800'
      }`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
            done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-300'
          }`}
        >
          {done ? <Icon name="Check" size={14} /> : String(item.num)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium leading-snug">{String(item.title)}</h3>
          <p className="text-xs text-slate-500">
            {done ? 'Сделано' : 'Запланировано'}
            {done && item.done_at
              ? ` · ${new Date(String(item.done_at)).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                })}`
              : ''}
          </p>
        </div>
        <Icon
          name="ChevronDown"
          size={18}
          className={`mt-0.5 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-slate-800 px-4 pb-4 pt-3">
          {String(item.text)
            .split('\n\n')
            .map((p, i) => (
              <p key={i} className="mb-2 text-sm leading-relaxed text-slate-400 last:mb-0">
                {p}
              </p>
            ))}
          {item.result ? (
            <p className="mt-3 rounded-md border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-sm leading-relaxed text-emerald-200/90">
              Результат: {String(item.result)}
            </p>
          ) : null}
          {fact.length > 0 ? (
            <div className="mt-3 rounded-md border border-slate-800 bg-slate-950 p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                Что сделано по факту
              </p>
              <ul className="space-y-1.5">
                {fact.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-400">
                    <Icon
                      name="Check"
                      size={14}
                      className="mt-1 shrink-0 text-emerald-400/70"
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

const BlocksStages = ({ data }: { data?: Item }) => {
  if (!data) return null;

  const blocks = (data.blocks ?? []) as Item[];

  return (
    <div className="space-y-5">
      {data.rule ? (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
          <p className="text-sm leading-relaxed text-amber-200/90">{String(data.rule)}</p>
        </div>
      ) : null}

      {blocks.map((block, bi) => {
        const items = (block.items ?? []) as Item[];
        const date = block.date
          ? new Date(String(block.date)).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : '';
        return (
          <div key={bi}>
            <div className="mb-2">
              <h2 className="font-medium leading-snug">{String(block.title)}</h2>
              <p className="text-xs text-slate-500">
                {date}
                {items.length
                  ? ` · сделано ${items.filter((x) => x.state === 'сделано').length} из ${items.length}`
                  : ''}
              </p>
              {block.note ? (
                <p className="mt-1 text-xs text-slate-500">{String(block.note)}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <StageCard key={i} item={item} defaultOpen={i === items.length - 1} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BlocksStages;