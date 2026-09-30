import { useState } from 'react';
import Icon from '@/components/ui/icon';

type Item = Record<string, unknown>;

const StageCard = ({ item, defaultOpen }: { item: Item; defaultOpen: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs text-slate-300">
          {String(item.num)}
        </span>
        <h3 className="min-w-0 flex-1 font-medium leading-snug">{String(item.title)}</h3>
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
                {items.length ? ` · этапов: ${items.length}` : ''}
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
