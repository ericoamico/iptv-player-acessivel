import { create } from 'zustand';

import { downloadXmltv } from '../api/epg';
import { xtreamXmltvUrl } from '../api/xtream';
import type { Account, EpgGuide, Playlist } from '../types';
import { readJson, removeJson, writeJson } from '../utils/fileCache';

const CACHE = 'epg';

interface EpgCache {
  guide: EpgGuide;
  updatedAt: number;
  source: string;
}

interface EpgState {
  guide: EpgGuide;
  updatedAt: number | null;
  loading: boolean;
  error: string | null;
  loadCache: () => Promise<number | null>;
  refresh: (account: Account, playlist: Playlist) => Promise<number>;
  reset: () => void;
}

/** Ordem: URL personalizada → url-tvg da lista M3U → xmltv.php do Xtream. */
export function epgSourceFor(account: Account, playlist: Playlist | null): string | undefined {
  if (account.epgUrl) return account.epgUrl;
  if (playlist?.epgUrl) return playlist.epgUrl;
  if (account.type === 'xtream') return xtreamXmltvUrl(account);
  return undefined;
}

export const useEpg = create<EpgState>((set, get) => ({
  guide: {},
  updatedAt: null,
  loading: false,
  error: null,
  loadCache: async () => {
    if (get().updatedAt) return get().updatedAt;
    const cached = await readJson<EpgCache>(CACHE);
    if (cached) set({ guide: cached.guide, updatedAt: cached.updatedAt });
    return cached?.updatedAt ?? null;
  },
  /** Retorna quantos canais ficaram com programação. */
  refresh: async (account, playlist) => {
    const source = epgSourceFor(account, playlist);
    if (!source) {
      set({ error: 'Nenhuma fonte de EPG configurada.' });
      return 0;
    }
    set({ loading: true, error: null });
    try {
      const guide = await downloadXmltv(source, playlist.channels);
      const updatedAt = Date.now();
      set({ guide, updatedAt, loading: false });
      await writeJson(CACHE, { guide, updatedAt, source } satisfies EpgCache);
      return Object.keys(guide).length;
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
      throw e;
    }
  },
  reset: () => {
    removeJson(CACHE);
    set({ guide: {}, updatedAt: null, error: null });
  },
}));
