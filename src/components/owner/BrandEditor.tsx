import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { BrandRow, Manufacturer, innError, saveBrand } from '@/lib/nomenclature';

type Props = {
  brand: BrandRow | 'new' | null;
  manufacturers: Manufacturer[];
  onClose: () => void;
  onSaved: () => void;
};

const BrandEditor = ({ brand, manufacturers, onClose, onSaved }: Props) => {
  const [name, setName] = useState('');
  const [manId, setManId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [manName, setManName] = useState('');
  const [manInn, setManInn] = useState('');
  const [manSearch, setManSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!brand) return;
    setName(brand === 'new' ? '' : brand.name);
    setManId(brand === 'new' ? null : brand.manufacturer?.id ?? null);
    setCreating(false);
    setManName('');
    setManInn('');
    setManSearch('');
    setError('');
  }, [brand]);

  if (!brand) return null;

  const innMsg = innError(manInn);
  const current = manufacturers.find((m) => m.id === manId) ?? null;
  const term = manSearch.trim().toLowerCase();
  const found = term
    ? manufacturers.filter(
        (m) => m.name.toLowerCase().includes(term) || (m.inn ?? '').includes(term),
      )
    : manufacturers;

  const save = async () => {
    setError('');
    if (!name.trim()) {
      setError('Название бренда обязательно');
      return;
    }
    if (creating && !manName.trim()) {
      setError('Наименование производителя обязательно');
      return;
    }
    if (creating && innMsg) {
      setError(innMsg);
      return;
    }
    setSaving(true);
    try {
      await saveBrand({
        id: brand === 'new' ? undefined : brand.id,
        name: name.trim(),
        manufacturer_id: creating ? null : manId,
        new_manufacturer: creating ? { name: manName.trim(), inn: manInn } : null,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border-t border-slate-800 bg-slate-950 p-4 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-700" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{brand === 'new' ? 'Новый бренд' : 'Бренд'}</h2>
          <button onClick={onClose} className="text-slate-500">
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-slate-400">Название бренда</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-11 border-slate-800 bg-slate-900"
            />
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm text-slate-400">Производитель</p>
              <button
                onClick={() => setCreating((v) => !v)}
                className="text-xs text-primary"
              >
                {creating ? 'Выбрать из заведённых' : 'Завести нового'}
              </button>
            </div>

            {creating ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-500">Наименование производителя</Label>
                  <Input
                    value={manName}
                    onChange={(e) => setManName(e.target.value)}
                    placeholder='ООО "Аэро Трейд"'
                    className="mt-1 h-10 border-slate-800 bg-slate-950"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">ИНН производителя, по желанию</Label>
                  <Input
                    value={manInn}
                    onChange={(e) => setManInn(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    inputMode="numeric"
                    className="mt-1 h-10 border-slate-800 bg-slate-950"
                  />
                  {manInn && innMsg && <p className="mt-1 text-xs text-red-400">{innMsg}</p>}
                  {manInn && !innMsg && (
                    <p className="mt-1 text-xs text-emerald-400">ИНН верный</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {current && (
                  <div className="flex items-center justify-between rounded-md border border-slate-700 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{current.name}</p>
                      <p className="text-xs text-slate-500">ИНН {current.inn || '—'}</p>
                    </div>
                    <button onClick={() => setManId(null)} className="shrink-0 text-xs text-slate-400">
                      Отвязать
                    </button>
                  </div>
                )}
                {manufacturers.length > 0 ? (
                  <>
                    <Input
                      value={manSearch}
                      onChange={(e) => setManSearch(e.target.value)}
                      placeholder="Найти по наименованию или ИНН"
                      className="h-10 border-slate-800 bg-slate-950"
                    />
                    <div className="max-h-48 space-y-1 overflow-y-auto">
                      {found.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setManId(m.id)}
                          className={`w-full rounded-md px-3 py-2 text-left ${
                            m.id === manId ? 'bg-slate-800' : 'hover:bg-slate-800/60'
                          }`}
                        >
                          <p className="truncate text-sm">{m.name}</p>
                          <p className="text-xs text-slate-500">ИНН {m.inn || '—'}</p>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  !current && (
                    <p className="text-xs text-slate-500">Производителей пока нет — заведите нового</p>
                  )
                )}
              </div>
            )}
          </div>

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
      </div>
    </div>
  );
};

export default BrandEditor;
