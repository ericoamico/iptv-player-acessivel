import { create } from 'zustand';

import { downloadXmltv } from '../api/epg';
import { xtreamShortEpg, xtreamXmltvUrl } from '../api/xtream';
import { SHORT_EPG_CONCURRENCY, SHORT_EPG_TTL_MS } from '../config';
import type { Account, Channel, EpgGuide, Playlist, Programme } from '../types';
import { readJson, removeJson, writeJson } from '../utils/fileCache';

const CACHE = 'epg';

interface EpgCache {
  guide: EpgGuide;
  updatedAt: number;
  source: string;
}

interface EpgState {
  /** Guia completo (XMLTV), por id de canal. */
  guide: EpgGuide;
  /** EPG curto buscado canal a canal (Xtream), por id de canal. */
  short: EpgGuide;
  updatedAt: number | null;
  loading: boolean;
  error: string | null;
  loadCache: () => Promise<number | null>;
  refresh: (account: Account, playlist: Playlist) => Promise<number>;
  /** Pede o EPG curto de um canal (fila com poucos pedidos simultâneos). */
  requestShort: (account: Account, channel: Channel) => void;
  reset: () => void;
}

/** Ordem: URL personalizada → url-tvg da lista M3U → xmltv.php do Xtream. */
export function epgSourceFor(account: Account, playlist: Playlist | null): string | undefined {
  if (account.epgUrl) return account.epgUrl;
  if (playlist?.epgUrl) return playlist.epgUrl;
  if (account.type === 'xtream') return xtreamXmltvUrl(account);
  return undefined;
}

/**
 * Baixar o guia completo automaticamente?
 * No Xtream o guia completo costuma ser enorme, então por padrão usamos o EPG
 * curto canal a canal. Com endereço próprio, lista M3U ou opção ligada, baixa.
 */
export function shouldAutoDownloadFullEpg(account: Account, fullEpgAuto: boolean): boolean {
  return fullEpgAuto || !!account.epgUrl || account.type === 'm3u';
}

/** Programação de um canal: guia completo se houver, senão o EPG curto. */
export function programmesFor(s: Pick<EpgState, 'guide' | 'short'>, channelId: string): Programme[] | undefined {
  const full = s.guide[channelId];
  return full?.length ? full : s.short[channelId];
}

// Fila do EPG curto
const fetchedAt = new Map<string, number>();
const inFlight = new Set<string>();
const queue: { account: Account; channel: Channel }[] = [];
let active = 0;

export const useEpg = create<EpgState>((set, get) => {
  const pump = () => {
    while (active < SHORT_EPG_CONCURRENCY && queue.length) {
      const job = queue.shift()!;
      const { channel, account } = job;
      active++;
      xtreamShortEpg(account, channel.streamId!, 6)
        .then((list) => set((s) => ({ short: { ...s.short, [channel.id]: list } })))
        .catch(() => {
          // Sem programação para este canal; tenta de novo só depois do TTL.
        })
        .finally(() => {
          fetchedAt.set(channel.id, Date.now());
          inFlight.delete(channel.id);
          active--;
          pump();
        });
    }
  };

  return {
    guide: {},
    short: {},
    updatedAt: null,
    loading: false,
    error: null,
    loadCache: async () => {
      if (get().updatedAt) return get().updatedAt;
      const cached = await readJson<EpgCache>(CACHE);
      if (cached) set({ guide: cached.guide, updatedAt: cached.updatedAt });
      return cached?.updatedAt ?? null;
    },
    /** Baixa o guia completo. Retorna quantos canais ficaram com programação. */
    refresh: async (account, playlist) => {
      if (get().loading) return Object.keys(get().guide).length;
      const source = epgSourceFor(account, playlist);
      if (!source) {
        set({ error: 'Nenhuma fonte de guia configurada.' });
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
    requestShort: (account, channel) => {
      if (account.type !== 'xtream' || channel.streamId == null) return;
      if (get().guide[channel.id]?.length || inFlight.has(channel.id)) return;
      const last = fetchedAt.get(channel.id);
      if (last && Date.now() - last < SHORT_EPG_TTL_MS) return;
      inFlight.add(channel.id);
      queue.push({ account, channel });
      pump();
    },
    reset: () => {
      removeJson(CACHE);
      queue.length = 0;
      fetchedAt.clear();
      inFlight.clear();
      set({ guide: {}, short: {}, updatedAt: null, error: null });
    },
  };
});
