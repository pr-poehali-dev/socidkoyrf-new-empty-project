import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { fetchNomItem, saveNomItem, prettyName, NomItem, NomRefs } from '@/lib/nomenclature';

type Props = {
  id: number | 'new' | null;
  refs: NomRefs | null;
  onClose: () => void;
  onSaved: () => void;
};

const empty = {
  group: '',
  brand: '',
  model: '',
  article: '',
  weight: '',
  volume: '',
};

const NomEditor = ({ id, refs, onClose, onSaved }: Props) => {
  const [form, setForm] = useState(empty);
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState('');
  const [item, setItem] = useState<NomItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id === null) return;
    if (id === 'new') {
      setForm(empty);
      setFeatures([]);
      setItem(null);
      setError('');
      return;
    }
    setLoading(true);
    fetchNomItem(id)
      .then(({ item }) => {
        setItem(item);
        setForm({
          group: item.group ?? '',
          brand: item.brand ?? '',
          model: item.model ?? '',
          article: item.article ?? '',
          weight: item.weight != null ? String(item.weight) : '',
          volume: item.volume != null ? String(item.volume) : '',
        });
        setFeatures(item.features.map((f) => f.name));
      })
      .catch(() => setError('Не удалось открыть позицию'))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (key: keyof typeof empty, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addFeature = () => {
    const value = featureInput.trim();
    if (!value) return;
    if (!features.includes(value)) setFeatures((f) => [...f, value]);
    setFeatureInput('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await saveNomItem({
        id: id === 'new' ? null : id,
        ...form,
        features,
      });
      onSaved();
      onClose();
    } catch {
      setError('Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const preview = prettyName({ ...form, features });

  return (
    <Sheet open={id !== null} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto border-slate-800 bg-slate-950 text-slate-100"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-slate-100">
            {id === 'new' ? 'Новая позиция' : 'Позиция номенклатуры'}
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Загружаю…</p>
        ) : (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
              <p className="text-xs text-slate-500">Наименование собирается само</p>
              <p className="mt-1 leading-snug">{preview}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-slate-400">Товарная группа</Label>
                <Input
                  list="nom-groups"
                  value={form.group}
                  onChange={(e) => set('group', e.target.value)}
                  placeholder="Дрель"
                  className="mt-1 h-11 border-slate-800 bg-slate-900"
                />
                <datalist id="nom-groups">
                  {refs?.groups.map((g) => (
                    <option key={g.id} value={g.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <Label className="text-slate-400">Бренд</Label>
                <Input
                  list="nom-brands"
                  value={form.brand}
                  onChange={(e) => set('brand', e.target.value)}
                  placeholder="Bosch"
                  className="mt-1 h-11 border-slate-800 bg-slate-900"
                />
                <datalist id="nom-brands">
                  {refs?.brands.map((b) => (
                    <option key={b.id} value={b.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <Label className="text-slate-400">Модель</Label>
                <Input
                  value={form.model}
                  onChange={(e) => set('model', e.target.value)}
                  placeholder="MB-117-5"
                  className="mt-1 h-11 border-slate-800 bg-slate-900"
                />
              </div>

              <div>
                <Label className="text-slate-400">Артикул</Label>
                <Input
                  value={form.article}
                  onChange={(e) => set('article', e.target.value)}
                  placeholder="пусто — возьмём модель"
                  className="mt-1 h-11 border-slate-800 bg-slate-900"
                />
              </div>

              <div>
                <Label className="text-slate-400">Вес, кг</Label>
                <Input
                  inputMode="decimal"
                  value={form.weight}
                  onChange={(e) => set('weight', e.target.value)}
                  className="mt-1 h-11 border-slate-800 bg-slate-900"
                />
              </div>

              <div>
                <Label className="text-slate-400">Объём, м³</Label>
                <Input
                  inputMode="decimal"
                  value={form.volume}
                  onChange={(e) => set('volume', e.target.value)}
                  className="mt-1 h-11 border-slate-800 bg-slate-900"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-400">Признаки</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  list="nom-features"
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addFeature();
                    }
                  }}
                  placeholder="аккумуляторная"
                  className="h-11 border-slate-800 bg-slate-900"
                />
                <datalist id="nom-features">
                  {refs?.features.map((f) => (
                    <option key={f.id} value={f.name} />
                  ))}
                </datalist>
                <Button variant="secondary" className="h-11 shrink-0" onClick={addFeature}>
                  <Icon name="Plus" size={18} />
                </Button>
              </div>
              {features.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {features.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFeatures((list) => list.filter((x) => x !== f))}
                      className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-300"
                    >
                      {f}
                      <Icon name="X" size={14} className="text-slate-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {item && item.supplier_names.length > 0 && (
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                <p className="mb-2 text-xs text-slate-500">Наименования поставщиков</p>
                <ul className="space-y-1 text-sm text-slate-400">
                  {item.supplier_names.map((s) => (
                    <li key={s.id}>
                      {s.name}
                      {s.supplier ? ` · ${s.supplier}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {item && item.supplier_articles.length > 0 && (
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                <p className="mb-2 text-xs text-slate-500">Артикулы поставщиков</p>
                <ul className="space-y-1 text-sm text-slate-400">
                  {item.supplier_articles.map((s) => (
                    <li key={s.id}>
                      {s.article}
                      {s.supplier ? ` · ${s.supplier}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-2 pb-2">
              <Button className="h-11 flex-1" onClick={save} disabled={saving}>
                {saving ? 'Сохраняю…' : 'Сохранить'}
              </Button>
              <Button variant="ghost" className="h-11" onClick={onClose}>
                Отмена
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default NomEditor;
