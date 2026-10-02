import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OwnerLayout from '@/components/owner/OwnerLayout';
import BrandEditor from '@/components/owner/BrandEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { BrandRow, Manufacturer, fetchBrands } from '@/lib/nomenclature';

const Brands = () => {
  const [search, setSearch] = useState('');
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<BrandRow | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchBrands(search.trim());
      setBrands(data.brands);
      setManufacturers(data.manufacturers);
    } catch {
      setError('Не удалось загрузить бренды');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <OwnerLayout>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to="/owner/nomenclature"
              className="mb-1 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
            >
              <Icon name="ChevronLeft" size={14} />
              Номенклатура
            </Link>
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <Icon name="Tags" size={20} className="text-primary" />
              Бренды
            </h1>
            <p className="text-sm text-slate-500">Брендов: {brands.length}</p>
          </div>
          <Button className="h-10 shrink-0" onClick={() => setEditing('new')}>
            <Icon name="Plus" size={18} className="sm:mr-1" />
            <span className="hidden sm:inline">Бренд</span>
          </Button>
        </div>

        <div className="relative">
          <Icon
            name="Search"
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Бренд, производитель или ИНН"
            className="h-11 border-slate-800 bg-slate-900 pl-10"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {!loading && brands.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 px-4 py-10 text-center">
            <p className="text-sm text-slate-500">
              {search ? 'Ничего не нашлось' : 'Брендов пока нет. Они появятся из позиций номенклатуры'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => setEditing(b)}
                className="flex w-full items-start gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{b.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {b.manufacturer
                      ? `${b.manufacturer.name}${b.manufacturer.inn ? ` · ИНН ${b.manufacturer.inn}` : ''}`
                      : 'Производитель не указан'}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                  {b.count}
                </span>
                <Icon name="ChevronRight" size={18} className="mt-0.5 shrink-0 text-slate-600" />
              </button>
            ))}
          </div>
        )}
      </div>

      <BrandEditor
        brand={editing}
        manufacturers={manufacturers}
        onClose={() => setEditing(null)}
        onSaved={load}
      />
    </OwnerLayout>
  );
};

export default Brands;
