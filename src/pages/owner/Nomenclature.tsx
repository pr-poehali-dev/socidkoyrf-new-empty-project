import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OwnerLayout from '@/components/owner/OwnerLayout';
import NomEditor from '@/components/owner/NomEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import {
  fetchNomenclature,
  prettyName,
  NomListItem,
  NomRefs,
} from '@/lib/nomenclature';

const PAGE = 30;

const Nomenclature = () => {
  const [items, setItems] = useState<NomListItem[]>([]);
  const [refs, setRefs] = useState<NomRefs | null>(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [groupId, setGroupId] = useState<number | null>(null);
  const [brandId, setBrandId] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | 'new' | null>(null);

  const load = useCallback(
    async (reset: boolean) => {
      setLoading(true);
      try {
        const next = reset ? 0 : offset;
        const data = await fetchNomenclature({
          search,
          group_id: groupId,
          brand_id: brandId,
          limit: PAGE,
          offset: next,
        });
        setRefs(data.refs);
        setTotal(data.total);
        setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
        setOffset(next + data.items.length);
      } finally {
        setLoading(false);
      }
    },
    [search, groupId, brandId, offset],
  );

  useEffect(() => {
    const t = setTimeout(() => load(true), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, groupId, brandId]);

  return (
    <OwnerLayout>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <Icon name="Library" size={20} className="text-primary" />
              Номенклатура
            </h1>
            <p className="text-sm text-slate-500">
              Справочник прародителей. Позиций: {total}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link to="/owner/nomenclature/upload">
              <Button variant="secondary" className="h-10">
                <Icon name="Upload" size={18} className="sm:mr-1" />
                <span className="hidden sm:inline">Прайс</span>
              </Button>
            </Link>
            <Button className="h-10" onClick={() => setEditing('new')}>
              <Icon name="Plus" size={18} className="sm:mr-1" />
              <span className="hidden sm:inline">Позиция</span>
            </Button>
          </div>
        </div>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск: название, артикул, модель"
          className="h-11 border-slate-800 bg-slate-900"
        />

        {refs && (refs.groups.length > 0 || refs.brands.length > 0) && (
          <div className="space-y-2">
            {refs.groups.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setGroupId(null)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
                    groupId === null
                      ? 'border-slate-600 bg-slate-800 text-white'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  Все группы
                </button>
                {refs.groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGroupId(groupId === g.id ? null : g.id)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
                      groupId === g.id
                        ? 'border-slate-600 bg-slate-800 text-white'
                        : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}

            {refs.brands.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setBrandId(null)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
                    brandId === null
                      ? 'border-slate-600 bg-slate-800 text-white'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  Все бренды
                </button>
                {refs.brands.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBrandId(brandId === b.id ? null : b.id)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
                      brandId === b.id
                        ? 'border-slate-600 bg-slate-800 text-white'
                        : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {items.length === 0 && !loading ? (
          <div className="rounded-lg border border-dashed border-slate-800 p-8 text-center">
            <Icon name="PackageOpen" size={28} className="mx-auto mb-2 text-slate-600" />
            <p className="text-sm text-slate-500">
              {search || groupId || brandId
                ? 'Ничего не нашлось'
                : 'Справочник пуст. Заведите позицию руками или загрузите прайс'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setEditing(item.id)}
                className="flex w-full items-start gap-3 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{prettyName(item)}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {[item.article && `арт. ${item.article}`, item.brand, item.group]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <Icon name="ChevronRight" size={18} className="mt-0.5 shrink-0 text-slate-600" />
              </button>
            ))}
          </div>
        )}

        {items.length < total && (
          <Button
            variant="secondary"
            className="h-11 w-full"
            onClick={() => load(false)}
            disabled={loading}
          >
            {loading ? 'Загружаю…' : 'Показать ещё'}
          </Button>
        )}
      </div>

      <NomEditor
        id={editing}
        refs={refs}
        onClose={() => setEditing(null)}
        onSaved={() => load(true)}
      />
    </OwnerLayout>
  );
};

export default Nomenclature;