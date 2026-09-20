import funcUrls from '../../backend/func2url.json';

const AUTH_URL = funcUrls.auth;
const TOKEN_KEY = 'session_token';

export type User = {
  id: number;
  name: string;
  avatar: string | null;
  role: string;
};

export type SessionInfo = {
  id: number;
  device: string;
  ip: string;
  created_at: string;
  last_seen_at: string;
  current: boolean;
};

export type Identity = {
  provider: string;
  created_at: string;
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const vkRedirectUri = () => `${window.location.origin}/auth/vk/callback`;

export async function startVkLogin(): Promise<string> {
  const res = await fetch(
    `${AUTH_URL}?action=start&redirect_uri=${encodeURIComponent(vkRedirectUri())}`,
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'start_failed');
  return data.url;
}

export async function completeVkLogin(code: string, state: string, deviceId: string) {
  const res = await fetch(`${AUTH_URL}?action=callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state, device_id: deviceId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'login_failed');
  setToken(data.token);
  return data;
}

export async function fetchMe(): Promise<{
  user: User;
  sessions: SessionInfo[];
  identities: Identity[];
} | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${AUTH_URL}?action=me`, {
    headers: { 'X-Auth-Token': token },
  });
  if (!res.ok) {
    clearToken();
    return null;
  }
  return res.json();
}

export async function logout(everywhere = false) {
  const token = getToken();
  if (token) {
    await fetch(`${AUTH_URL}?action=logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
      body: JSON.stringify({ everywhere }),
    });
  }
  clearToken();
}

export async function deleteAccount() {
  const token = getToken();
  if (!token) return;
  await fetch(`${AUTH_URL}?action=delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
    body: JSON.stringify({}),
  });
  clearToken();
}
