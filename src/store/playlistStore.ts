import { create } from 'zustand';

import { m3uPlaylist } from '../api/m3u';
import { xtreamPlaylist, xtreamStreamUrl } from '../api/xtream';
import type { Account, Channel, Playlist } from '../types';
import { readJson, removeJson, writeJson } from '../utils/fileCache';
import type { StreamFormat } from './settingsStore';

const CACHE = 'playlist';

interface PlaylistState {
  playlist: Playlist | null;
  byCategory: Record<string, Channel[]>;
  byId: Record<string, Channel>;
  loading: boolean;
  error: string | null;
  loadCache: () => Promise<Playlist | null>;
  refresh: (account: Account) => Promise<Playlist>;
  reset: () => void;
}

function index(playlist: Playlist | null) {
  const byCategory: Record<string, Channel[]> = {};
  const byId: Record<string, Channel> = {};
  for (const c of playlist?.channels ?? []) {
    (byCategory[c.categoryId] ??= []).push(c);
    byId[c.id] = c;
  }
  return { byCategory, byId };
}

export const usePlaylist = create<PlaylistState>((set, get) => ({
  playlist: null,
  byCategory: {},
  byId: {},
  loading: false,
  error: null,
  loadCache: async () => {
    if (get().playlist) return get().playlist;
    const cached = await readJson<Playlist>(CACHE);
    if (cached) set({ playlist: cached, ...index(cached) });
    return cached;
  },
  refresh: async (account) => {
    set({ loading: true, error: null });
    try {
      const playlist =
        account.type === 'xtream' ? await xtreamPlaylist(account) : await m3uPlaylist(account.m3uUrl ?? '');
      set({ playlist, ...index(playlist), loading: false });
      await writeJson(CACHE, playlist);
      return playlist;
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },
  reset: () => {
    removeJson(CACHE);
    set({ playlist: null, byCategory: {}, byId: {}, error: null });
  },
}));

export function streamUrlFor(account: Account, channel: Channel, format: StreamFormat): string {
  if (channel.url) return channel.url;
  if (channel.streamId != null) return xtreamStreamUrl(account, channel.streamId, format);
  return '';
}
