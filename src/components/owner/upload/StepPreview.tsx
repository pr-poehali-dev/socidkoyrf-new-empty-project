import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { ParsedRow, Verdict } from '@/lib/nomUpload';
import { prettyName } from '@/lib/nomenclature';

const verdicts: { key: Verdict | 'все'; label: string }[] = [
  { key: 'все', label: 'Все' },
  { key: 'новое', label: 'Новое' },
  { key: 'похоже', label: 'Похоже' },
  { key: 'совпадение', label: 'Совпадение' },
  { key: 'проблема', label: 'Проблемы' },
];

const tone: Record<string, string> = {
  новое: 'border-emerald-500/30 text-emerald-300',
  похоже: 'border-amber-500/30 text-amber-300',
  совпадение: 'border-sky-500/30 text-sky-300',
  проблема: 'border-red-500/30 text-red-300',
};

type Props = {
  rows: ParsedRow[];
  setRows: (rows: ParsedRow[]) => void;
};

const RowCard = ({
  row,
  onChange,
}: {
  row: ParsedRow;
  onChange: (r: ParsedRow) => void;
}) => {
  const [open, setOpen] = useState(false);
  const set = (key: keyof ParsedRow, value: string) =>
    onChange({ ...row, [key]: value || null });

  return (
    <div
      className={`rounded-lg border bg-slate-900 ${
        row.skip ? 'border-slate-800 opacity-50' : tone[row.verdict] || 'border-slate-800'
      }`}
    >
      <div className="flex items-start gap-2 px-3 py-2.5">
        <button
          onClick={() => onChange({ ...row, skip: !row.skip })}
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-600"
        >
          {!row.skip && <Icon name="Check" size={13} className="text-emerald-400" />}
        </button>
        <button onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-medium text-slate-200">
            {prettyName(row) !== 'Без названия' ? prettyName(row) : row.raw_name}
          </p>
          <p className="truncate text-xs text-slate-500">
            {row.verdict}
            {row.article ? ` · арт. ${row.article}` : ''}
            {row.problems.length ? ` · ${row.problems[0]}` : ''}
          </p>
        </button>
        <Icon
          name="ChevronDown"
          size={16}
          className={`mt-1 shrink-0 text-slate-600 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {open && (
        <div className="space-y-2 border-t border-slate-800 px-3 pb-3 pt-2">
          <p className="text-xs text-slate-600">Из файла: {row.raw_name}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-slate-500">Группа</Label>
              <Input
                value={row.group ?? ''}
                onChange={(e) => set('group', e.target.value)}
                className="mt-0.5 h-9 border-slate-800 bg-slate-950 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Бренд</Label>
              <Input
                value={row.brand ?? ''}
                onChange={(e) => set('brand', e.target.value)}
                className="mt-0.5 h-9 border-slate-800 bg-slate-950 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Модель</Label>
              <Input
                value={row.model ?? ''}
                onChange={(e) => set('model', e.target.value)}
                className="mt-0.5 h-9 border-slate-800 bg-slate-950 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Артикул</Label>
              <Input
                value={row.article ?? ''}
                onChange={(e) => set('article', e.target.value)}
                className="mt-0.5 h-9 border-slate-800 bg-slate-950 text-sm"
              />
            </div>
          </div>

          {row.features.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {row.features.map((f) => (
                <button
                  key={f}
                  onClick={() =>
                    onChange({ ...row, features: row.features.filter((x) => x !== f) })
                  }
                  className="flex items-center gap-1 rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-400"
                >
                  {f}
                  <Icon name="X" size={11} className="text-slate-600" />
                </button>
              ))}
            </div>
          )}

          {row.problems.length > 0 && (
            <ul className="space-y-0.5">
              {row.problems.map((p, i) => (
                <li key={i} className="text-xs text-red-400/80">
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

const StepPreview = ({ rows, setRows }: Props) => {
  const [filter, setFilter] = useState<Verdict | 'все'>('все');

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.verdict] = (acc[r.verdict] ?? 0) + 1;
    return acc;
  }, {});

  const shown = filter === 'все' ? rows : rows.filter((r) => r.verdict === filter);
  const willWrite = rows.filter((r) => !r.skip).length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Проверьте до записи. Галочка слева — писать или пропустить. Нажатие на строку
        открывает правку.
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {verdicts.map((v) => {
          const n = v.key === 'все' ? rows.length : counts[v.key] ?? 0;
          return (
            <button
              key={v.key}
              onClick={() => setFilter(v.key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
                filter === v.key
                  ? 'border-slate-600 bg-slate-800 text-white'
                  : 'border-slate-800 text-slate-400'
              }`}
            >
              {v.label} · {n}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-400">
        Будет записано строк: <span className="text-slate-200">{willWrite}</span> из{' '}
        {rows.length}
      </div>

      <div className="space-y-2">
        {shown.map((row) => (
          <RowCard
            key={row.row}
            row={row}
            onChange={(next) => setRows(rows.map((r) => (r.row === row.row ? next : r)))}
          />
        ))}
      </div>
    </div>
  );
};

export default StepPreview;
