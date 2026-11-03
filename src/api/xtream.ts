import type { Account, AccountInfo, Category, Channel, Playlist, Programme } from '../types';
import { base64ToUtf8 } from '../utils/text';
import { enc } from '../utils/url';
import { AppError, getJson } from './http';

interface XtreamAuth {
  user_info?: {
    auth?: number | string;
    status?: string;
    exp_date?: string | number | null;
    max_connections?: string | number;
    active_cons?: string | number;
  };
}

interface XtreamCategory {
  category_id: string | number;
  category_name: string;
}

interface XtreamStream {
  num?: number | string;
  name: string;
  stream_id: number | string;
  stream_icon?: string;
  epg_channel_id?: string | null;
  category_id?: string | number | null;
}

interface XtreamShortEpg {
  epg_listings?: {
    title?: string;
    description?: string;
    start_timestamp?: string | number;
    stop_timestamp?: string | number;
  }[];
}

const NO_CATEGORY = '__sem_categoria__';

function api(a: Account, action?: string, extra = '') {
  const base = `${a.server}/player_api.php?username=${enc(a.username)}&password=${enc(a.password)}`;
  return action ? `${base}&action=${action}${extra}` : base;
}

/** Valida usuário e senha. Lança AppError('auth') se forem recusados. */
export async function xtreamLogin(a: Account): Promise<AccountInfo> {
  const data = await getJson<XtreamAuth | unknown[]>(api(a));
  const info = !Array.isArray(data) ? data?.user_info : undefined;
  if (!info || String(info.auth) !== '1') {
    throw new AppError('Usuário ou senha incorretos, ou acesso expirado.', 'auth');
  }
  const exp = info.exp_date ? Number(info.exp_date) : NaN;
  return {
    status: info.status,
    expiresAt: Number.isFinite(exp) && exp > 0 ? exp * 1000 : null,
    maxConnections: info.max_connections != null ? Number(info.max_connections) : undefined,
    activeConnections: info.active_cons != null ? Number(info.active_cons) : undefined,
  };
}

export async function xtreamPlaylist(a: Account): Promise<Playlist> {
  const accountInfo = await xtreamLogin(a);
  const [cats, streams] = await Promise.all([
    getJson<XtreamCategory[]>(api(a, 'get_live_categories')),
    getJson<XtreamStream[]>(api(a, 'get_live_streams'), 90_000),
  ]);
  if (!Array.isArray(cats) || !Array.isArray(streams)) {
    throw new AppError('O servidor retornou uma lista inválida.', 'format');
  }

  const channels: Channel[] = streams.map((s) => ({
    id: String(s.stream_id),
    streamId: Number(s.stream_id),
    name: (s.name ?? '').trim() || `Canal ${s.stream_id}`,
    number: s.num != null && s.num !== '' ? Number(s.num) : undefined,
    logo: s.stream_icon || undefined,
    epgChannelId: s.epg_channel_id || undefined,
    categoryId: s.category_id != null && s.category_id !== '' ? String(s.category_id) : NO_CATEGORY,
  }));

  const counts = new Map<string, number>();
  for (const c of channels) counts.set(c.categoryId, (counts.get(c.categoryId) ?? 0) + 1);

  const categories: Category[] = cats
    .map((c) => ({ id: String(c.category_id), name: (c.category_name ?? '').trim(), channelCount: counts.get(String(c.category_id)) ?? 0 }))
    .filter((c) => c.channelCount > 0);
  const known = new Set(categories.map((c) => c.id));
  for (const [id, count] of counts) {
    if (!known.has(id)) categories.push({ id, name: id === NO_CATEGORY ? 'Sem categoria' : `Categoria ${id}`, channelCount: count });
  }

  return { categories, channels, updatedAt: Date.now(), accountInfo };
}

export function xtreamStreamUrl(a: Account, streamId: number, format: 'ts' | 'm3u8') {
  return `${a.server}/live/${enc(a.username)}/${enc(a.password)}/${streamId}.${format}`;
}

export function xtreamXmltvUrl(a: Account) {
  return `${a.server}/xmltv.php?username=${enc(a.username)}&password=${enc(a.password)}`;
}

/** EPG curto de um canal (títulos e descrições vêm em base64). */
export async function xtreamShortEpg(a: Account, streamId: number, limit = 20): Promise<Programme[]> {
  const data = await getJson<XtreamShortEpg>(api(a, 'get_short_epg', `&stream_id=${streamId}&limit=${limit}`));
  return (data.epg_listings ?? [])
    .map((p) => ({
      start: Number(p.start_timestamp) * 1000,
      stop: Number(p.stop_timestamp) * 1000,
      title: base64ToUtf8(p.title ?? '').trim() || 'Sem título',
      description: base64ToUtf8(p.description ?? '').trim() || undefined,
    }))
    .filter((p) => Number.isFinite(p.start) && Number.isFinite(p.stop))
    .sort((x, y) => x.start - y.start);
}
