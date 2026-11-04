import { useMemo } from 'react';

import { useAuth } from '../store/authStore';
import { accountKey, FAVORITES_ID, favKey, useFavorites } from '../store/favoritesStore';
import { usePlaylist } from '../store/playlistStore';
import type { Channel } from '../types';

const EMPTY: string[] = [];

/** Chaves de favoritos da conta atual, na ordem escolhida pelo usuário. */
export function useFavoriteKeys(): string[] {
  const account = useAuth((s) => s.account);
  return useFavorites((s) => (account ? s.byAccount[accountKey(account)] : undefined) ?? EMPTY);
}

/** Canais favoritos da conta atual que existem na lista carregada. */
export function useFavoriteChannels(): Channel[] {
  const keys = useFavoriteKeys();
  const channels = usePlaylist((s) => s.playlist?.channels);
  return useMemo(() => {
    if (!channels || !keys.length) return [];
    const byKey = new Map(channels.map((c) => [favKey(c), c]));
    return keys.map((k) => byKey.get(k)).filter((c): c is Channel => !!c);
  }, [channels, keys]);
}

/** Canais de uma categoria (ou dos favoritos). undefined = categoria não existe. */
export function useCategoryChannels(categoryId?: string): Channel[] | undefined {
  const favorites = useFavoriteChannels();
  const regular = usePlaylist((s) => (categoryId && categoryId !== FAVORITES_ID ? s.byCategory[categoryId] : undefined));
  if (categoryId === FAVORITES_ID) return favorites;
  return regular;
}
