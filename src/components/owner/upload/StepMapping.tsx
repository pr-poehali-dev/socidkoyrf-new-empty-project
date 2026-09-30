import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { Alphabet } from '@/lib/nomUpload';

export type Mapping = {
  name: string;
  article: string;
  brand: string;
  group: string;
  weight: string;
  volume: string;
};

const fields: { key: keyof Mapping; label: string; hint: string; required?: boolean }[] = [
  { key: 'name', label: 'Наименование', hint: 'обязательно', required: true },
  { key: 'article', label: 'Артикул', hint: 'пусто — возьмём модель' },
  { key: 'brand', label: 'Бренд', hint: 'если есть отдельной колонкой' },
  { key: 'group', label: 'Товарная группа', hint: 'если есть отдельной колонкой' },
  { key: 'weight', label: 'Вес', hint: 'кг' },
  { key: 'volume', label: 'Объём', hint: 'м³' },
];

type Props = {
  headerRow: string[];
  mapping: Mapping;
  setMapping: (m: Mapping) => void;
  alphaName: Alphabet;
  setAlphaName: (a: Alphabet) => void;
  alphaArticle: Alphabet;
  setAlphaArticle: (a: Alphabet) => void;
};

const alphabets: { key: Alphabet; label: string }[] = [
  { key: 'none', label: 'Не трогать' },
  { key: 'cyr', label: 'Кириллица' },
  { key: 'lat', label: 'Латиница' },
];

const AlphaPicker = ({
  value,
  onChange,
}: {
  value: Alphabet;
  onChange: (a: Alphabet) => void;
}) => (
  <div className="mt-1 flex gap-1">
    {alphabets.map((a) => (
      <button
        key={a.key}
        onClick={() => onChange(a.key)}
        className={`flex-1 rounded-md border px-2 py-2 text-xs ${
          value === a.key
            ? 'border-slate-600 bg-slate-800 text-white'
            : 'border-slate-800 text-slate-400'
        }`}
      >
        {a.label}
      </button>
    ))}
  </div>
);

const StepMapping = ({
  headerRow,
  mapping,
  setMapping,
  alphaName,
  setAlphaName,
  alphaArticle,
  setAlphaArticle,
}: Props) => (
  <div className="space-y-4">
    <p className="text-sm text-slate-500">
      Скажите, что в какой колонке. Цены и количества не нужны — это не номенклатура.
    </p>

    <div className="space-y-3">
      {fields.map((f) => (
        <div key={f.key}>
          <Label className="text-slate-400">
            {f.label}
            {f.required && <span className="ml-1 text-red-400">*</span>}
            <span className="ml-2 text-xs text-slate-600">{f.hint}</span>
          </Label>
          <select
            value={mapping[f.key]}
            onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
            className="mt-1 h-11 w-full rounded-md border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100"
          >
            <option value="">— нет —</option>
            {headerRow.map((h, i) => (
              <option key={i} value={String(i)}>
                {h || `колонка ${i + 1}`}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>

    <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
      <div className="mb-3 flex items-start gap-2">
        <Icon name="Languages" size={16} className="mt-0.5 shrink-0 text-slate-500" />
        <p className="text-xs leading-relaxed text-slate-500">
          Буквы-двойники вроде русской «С» и английской «C» выглядят одинаково, но для
          сравнения это разные знаки. Выберите, в какую сторону переписать.
        </p>
      </div>

      <Label className="text-slate-400">Алфавит наименования</Label>
      <AlphaPicker value={alphaName} onChange={setAlphaName} />

      <div className="mt-3">
        <Label className="text-slate-400">Алфавит артикула</Label>
        <AlphaPicker value={alphaArticle} onChange={setAlphaArticle} />
      </div>
    </div>
  </div>
);

export default StepMapping;
