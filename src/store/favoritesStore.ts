import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Account, Channel } from '../types';

/** Id da "categoria" de favoritos nas rotas (/category/[id]). */
export const FAVORITES_ID = '__favoritos__';

/** Favoritos ficam separados por conta (servidor + usuário, ou link M3U). */
export function accountKey(a: Account): string {
  return a.type === 'xtream' ? `x|${a.server}|${a.username}` : `m|${a.m3uUrl ?? ''}`;
}

/**
 * Chave estável do canal, que sobrevive à atualização da lista:
 * no Xtream, o stream_id; no M3U, o endereço do stream.
 */
export function favKey(c: Channel): string {
  return c.streamId != null ? `s${c.streamId}` : `u${c.url ?? c.id}`;
}

interface FavoritesState {
  byAccount: Record<string, string[]>;
  /** Adiciona ou remove. Retorna true se o canal ficou favorito. */
  toggle: (account: Account, channel: Channel) => boolean;
  /** Move o canal dentro dos favoritos (delta -1 = para cima). Retorna a nova posição (1..n) ou null. */
  move: (account: Account, channel: Channel, delta: number) => number | null;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      byAccount: {},
      toggle: (account, channel) => {
        const acc = accountKey(account);
        const key = favKey(channel);
        const list = get().byAccount[acc] ?? [];
        const isFav = list.includes(key);
        const next = isFav ? list.filter((k) => k !== key) : [...list, key];
        set({ byAccount: { ...get().byAccount, [acc]: next } });
        return !isFav;
      },
      move: (account, channel, delta) => {
        const acc = accountKey(account);
        const key = favKey(channel);
        const list = [...(get().byAccount[acc] ?? [])];
        const from = list.indexOf(key);
        const to = from + delta;
        if (from < 0 || to < 0 || to >= list.length) return null;
        list.splice(from, 1);
        list.splice(to, 0, key);
        set({ byAccount: { ...get().byAccount, [acc]: list } });
        return to + 1;
      },
    }),
    { name: 'favorites', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
