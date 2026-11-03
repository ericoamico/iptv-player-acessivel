import { useCallback, useEffect, useRef } from 'react';

import { useAuth } from '../store/authStore';
import { useEpg } from '../store/epgStore';
import { usePlaylist } from '../store/playlistStore';
import { useSettings } from '../store/settingsStore';
import { announce, plural } from '../utils/a11y';

/**
 * Carrega lista e EPG do cache e atualiza da internet quando não há cache
 * ou quando passou o intervalo de atualização automática.
 */
export function useDataSync() {
  const account = useAuth((s) => s.account);
  const autoRefreshHours = useSettings((s) => s.autoRefreshHours);
  const started = useRef(false);

  const refreshEpg = useCallback(
    async (silent = true) => {
      const playlist = usePlaylist.getState().playlist;
      if (!account || !playlist) return;
      if (!silent) announce('Atualizando guia de programação…');
      try {
        const n = await useEpg.getState().refresh(account, playlist);
        if (!silent) announce(`Guia atualizado. ${plural(n, 'canal', 'canais')} com programação.`);
      } catch (e) {
        if (!silent) announce(`Erro ao atualizar o guia: ${(e as Error).message}`);
      }
    },
    [account],
  );

  const refreshPlaylist = useCallback(async () => {
    if (!account) return;
    announce('Atualizando lista de canais…');
    try {
      const p = await usePlaylist.getState().refresh(account);
      announce(
        `Lista atualizada. ${plural(p.channels.length, 'canal', 'canais')} em ${plural(p.categories.length, 'categoria', 'categorias')}.`,
      );
      refreshEpg(true);
    } catch (e) {
      announce(`Erro ao atualizar a lista: ${(e as Error).message}`);
    }
  }, [account, refreshEpg]);

  useEffect(() => {
    if (!account || started.current) return;
    started.current = true;
    (async () => {
      const maxAge = autoRefreshHours * 3_600_000;
      const cached = await usePlaylist.getState().loadCache();
      if (!cached || (maxAge > 0 && Date.now() - cached.updatedAt > maxAge)) {
        await refreshPlaylist();
        return;
      }
      const epgAt = await useEpg.getState().loadCache();
      if (!epgAt || (maxAge > 0 && Date.now() - epgAt > maxAge)) refreshEpg(true);
    })();
  }, [account, autoRefreshHours, refreshPlaylist, refreshEpg]);

  return { refreshPlaylist, refreshEpg };
}
