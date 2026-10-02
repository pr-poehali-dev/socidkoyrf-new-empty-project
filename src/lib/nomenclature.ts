import funcUrls from '../../backend/func2url.json';
import { getToken } from '@/lib/auth';

const URL = (funcUrls as Record<string, string>).nomenclature;

export type Ref = { id: number; name: string };

export type NomRefs = {
  groups: Ref[];
  brands: Ref[];
  features: Ref[];
};

export type NomListItem = {
  id: number;
  group: string | null;
  brand: string | null;
  model: string | null;
  article: string | null;
  weight: number | null;
  volume: number | null;
  features: string[];
};

export type NomItem = {
  id: number;
  group_id: number | null;
  group: string | null;
  brand_id: number | null;
  brand: string | null;
  model: string | null;
  article: string | null;
  weight: number | null;
  volume: number | null;
  created_at: string;
  updated_at: string;
  features: Ref[];
  manufacturer: { name: string; inn: string | null } | null;
};

export type Manufacturer = { id: number; name: string; inn: string | null };

export type BrandRow = {
  id: number;
  name: string;
  manufacturer: Manufacturer | null;
  count: number;
};

const headers = (): Record<string, string> => {
  const token = getToken();
  const base: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) base['X-Auth-Token'] = token;
  return base;
};

export function prettyName(parts: {
  group?: string | null;
  brand?: string | null;
  model?: string | null;
  features?: string[] | Ref[];
}): string {
  const feats = (parts.features ?? []).map((f) =>
    typeof f === 'string' ? f : f.name,
  );
  const chunks = [parts.group, parts.brand, parts.model, ...feats].filter(Boolean);
  const text = chunks.join(' ').trim();
  return text || 'Без названия';
}

export async function fetchNomenclature(opts: {
  search?: string;
  group_id?: number | null;
  brand_id?: number | null;
  limit?: number;
  offset?: number;
}): Promise<{ items: NomListItem[]; total: number; refs: NomRefs }> {
  const p = new URLSearchParams({ action: 'list' });
  if (opts.search) p.set('search', opts.search);
  if (opts.group_id) p.set('group_id', String(opts.group_id));
  if (opts.brand_id) p.set('brand_id', String(opts.brand_id));
  p.set('limit', String(opts.limit ?? 50));
  p.set('offset', String(opts.offset ?? 0));
  const res = await fetch(`${URL}?${p.toString()}`, { headers: headers() });
  if (!res.ok) throw new Error('forbidden');
  return res.json();
}

export async function fetchNomItem(id: number): Promise<{ item: NomItem; refs: NomRefs }> {
  const res = await fetch(`${URL}?action=item&id=${id}`, { headers: headers() });
  if (!res.ok) throw new Error('not_found');
  return res.json();
}

export async function fetchBrands(
  search: string,
): Promise<{ brands: BrandRow[]; manufacturers: Manufacturer[] }> {
  const p = new URLSearchParams({ action: 'brands' });
  if (search) p.set('search', search);
  const res = await fetch(`${URL}?${p.toString()}`, { headers: headers() });
  if (!res.ok) throw new Error('forbidden');
  return res.json();
}

export async function saveBrand(body: {
  id?: number;
  name: string;
  manufacturer_id?: number | null;
  new_manufacturer?: { name: string; inn: string } | null;
}): Promise<{ id: number }> {
  const res = await fetch(`${URL}?action=brand_save`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Не удалось сохранить');
  return data;
}

const INN10 = [2, 4, 10, 3, 5, 9, 4, 6, 8];
const INN12A = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
const INN12B = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];

export function innError(inn: string): string {
  const v = inn.replace(/\D/g, '');
  if (!v) return '';
  if (v.length !== 10 && v.length !== 12) return 'ИНН — 10 цифр у организации или 12 у ИП';
  const d = v.split('').map(Number);
  const check = (w: number[]) => (w.reduce((s, k, i) => s + k * d[i], 0) % 11) % 10;
  const ok =
    v.length === 10
      ? check(INN10) === d[9]
      : check(INN12A) === d[10] && check(INN12B) === d[11];
  return ok ? '' : 'ИНН не прошёл проверку — похоже на опечатку';
}

export async function saveNomItem(body: Record<string, unknown>): Promise<{ id: number }> {
  const res = await fetch(`${URL}?action=save`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'save_failed');
  return data;
}