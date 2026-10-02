import funcUrls from '../../backend/func2url.json';
import { getToken } from '@/lib/auth';

const URL = (funcUrls as Record<string, string>).nom_upload;

export type Alphabet = 'none' | 'lat' | 'cyr';

export type RawRow = {
  row: number;
  name?: string;
  article?: string;
  brand?: string;
  group?: string;
  weight?: string;
  volume?: string;
};

export type Verdict = 'новое' | 'похоже' | 'совпадение' | 'проблема';

export type ParsedRow = {
  row: number;
  raw_name: string;
  name?: string;
  group: string | null;
  brand: string | null;
  model: string | null;
  article: string | null;
  features: string[];
  weight?: string | null;
  volume?: string | null;
  match_id: number | null;
  verdict: Verdict;
  problems: string[];
  skip: boolean;
};

export type UploadHistory = {
  id: number;
  file_name: string | null;
  rows_total: number;
  created: number;
  updated: number;
  skipped: number;
  status: string;
  created_at: string;
};

const headers = (): Record<string, string> => {
  const token = getToken();
  const base: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) base['X-Auth-Token'] = token;
  return base;
};

const post = async (action: string, body: unknown) => {
  const res = await fetch(`${URL}?action=${action}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || action);
  return data;
};

export async function fetchUploadHistory(): Promise<UploadHistory[]> {
  const res = await fetch(`${URL}?action=history`, { headers: headers() });
  if (!res.ok) return [];
  return (await res.json()).uploads ?? [];
}

export async function analyzeRows(
  rows: RawRow[],
  alpha_name: Alphabet,
  alpha_article: Alphabet,
): Promise<ParsedRow[]> {
  const data = await post('analyze', { rows, alpha_name, alpha_article });
  return data.rows ?? [];
}

export async function startUpload(body: {
  file_name: string;
  rows_total: number;
  mapping: Record<string, string>;
}): Promise<number> {
  const data = await post('start', body);
  return data.upload_id;
}

export async function commitRows(body: {
  upload_id: number;
  rows: ParsedRow[];
}): Promise<{ created: number; updated: number; skipped: number }> {
  return post('commit', body);
}

export async function finishUpload(upload_id: number) {
  return post('finish', { upload_id });
}
