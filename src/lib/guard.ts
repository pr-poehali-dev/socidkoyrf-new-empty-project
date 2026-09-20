import funcUrls from '../../backend/func2url.json';
import { getToken } from '@/lib/auth';

const GUARD_URL = funcUrls.guard;
const MEMORY_URL = funcUrls.memory;

export type GuardStatus = {
  authenticated: boolean;
  elevated: boolean;
  is_owner: boolean;
  owner_candidate: boolean;
  elevated_until: string | null;
};

const headers = (): Record<string, string> => {
  const token = getToken();
  const base: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) base['X-Auth-Token'] = token;
  return base;
};

export async function fetchGuardStatus(): Promise<GuardStatus> {
  const empty = {
    authenticated: false,
    elevated: false,
    is_owner: false,
    owner_candidate: false,
    elevated_until: null,
  };
  if (!getToken()) return empty;
  const res = await fetch(`${GUARD_URL}?action=status`, { headers: headers() });
  if (!res.ok) return empty;
  return res.json();
}

export async function elevate(): Promise<GuardStatus> {
  const res = await fetch(`${GUARD_URL}?action=elevate`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'elevate_failed');
  return fetchGuardStatus();
}

export async function dropElevation() {
  await fetch(`${GUARD_URL}?action=drop`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({}),
  });
}

export type OwnerLogEntry = {
  action: string;
  target: string | null;
  details: string | null;
  ip: string | null;
  created_at: string;
};

export async function fetchOwnerLog(): Promise<OwnerLogEntry[]> {
  const res = await fetch(`${GUARD_URL}?action=owner_log`, { headers: headers() });
  if (!res.ok) return [];
  const data = await res.json();
  return data.entries ?? [];
}

export type WaitlistEntry = {
  vk_id: string;
  name: string | null;
  avatar: string | null;
  created_at: string;
};

export type WaitlistData = {
  entries: WaitlistEntry[];
  total: number;
  attempts: number;
};

export async function fetchWaitlist(): Promise<WaitlistData> {
  const res = await fetch(`${GUARD_URL}?action=waitlist`, { headers: headers() });
  if (!res.ok) return { entries: [], total: 0, attempts: 0 };
  return res.json();
}

export async function fetchMemory() {
  const res = await fetch(`${MEMORY_URL}?action=all`, { headers: headers() });
  if (!res.ok) throw new Error('forbidden');
  return res.json();
}