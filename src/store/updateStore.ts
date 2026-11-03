import { Alert } from 'react-native';
import { create } from 'zustand';

import { downloadAndInstall, fetchLatest, isNewer, updatesSupported, type UpdateInfo } from '../update/updater';
import { announce } from '../utils/a11y';

type Status = 'idle' | 'checking' | 'upToDate' | 'available' | 'downloading' | 'error';

interface UpdateState {
  status: Status;
  latest: UpdateInfo | null;
  progress: number;
  error: string | null;
  lastCheck: number | null;
  /** Procura atualização. `silent`: não fala nada se não houver novidade. */
  check: (silent?: boolean) => Promise<void>;
  install: () => Promise<void>;
}

export const useUpdates = create<UpdateState>((set, get) => ({
  status: 'idle',
  latest: null,
  progress: 0,
  error: null,
  lastCheck: null,
  check: async (silent = false) => {
    if (!updatesSupported || get().status === 'checking' || get().status === 'downloading') return;
    set({ status: 'checking', error: null });
    if (!silent) announce('Procurando atualização…');
    try {
      const latest = await fetchLatest();
      const available = isNewer(latest);
      set({ latest, status: available ? 'available' : 'upToDate', lastCheck: Date.now() });
      if (available) {
        announce(`Nova versão disponível: ${latest.version}.`);
        Alert.alert(
          'Atualização disponível',
          `A versão ${latest.version} está disponível.${latest.notes ? `\n\nNovidades: ${latest.notes}` : ''}\n\nDeseja atualizar agora?`,
          [
            { text: 'Depois', style: 'cancel' },
            { text: 'Atualizar agora', onPress: () => get().install() },
          ],
        );
      } else if (!silent) {
        announce('O app já está na versão mais recente.');
      }
    } catch (e) {
      set({ status: 'error', error: (e as Error).message || 'Não foi possível procurar atualização.', lastCheck: Date.now() });
      if (!silent) announce('Não foi possível procurar atualização. Verifique a internet.');
    }
  },
  install: async () => {
    const { latest } = get();
    if (!latest || get().status === 'downloading') return;
    set({ status: 'downloading', progress: 0, error: null });
    announce('Baixando atualização. Aguarde.');
    let lastSpoken = 0;
    try {
      await downloadAndInstall(latest, (f) => {
        set({ progress: f });
        const pct = Math.floor(f * 100);
        if (pct >= lastSpoken + 25 && pct < 100) {
          lastSpoken = pct - (pct % 25);
          announce(`Atualização ${lastSpoken}% baixada.`, 0);
        }
      });
      set({ status: 'available', progress: 1 });
      announce('Download concluído. Confirme a instalação na tela do Android.');
    } catch (e) {
      const msg = (e as Error).message || 'Falha ao baixar a atualização.';
      set({ status: 'error', error: msg });
      announce(`Erro na atualização: ${msg}`);
    }
  },
}));
