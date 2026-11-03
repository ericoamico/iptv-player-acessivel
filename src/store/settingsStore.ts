import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type OrientationMode = 'portrait' | 'landscape' | 'auto';
export type StreamFormat = 'ts' | 'm3u8';

interface SettingsState {
  /** Modo de tela do app. Padrão: retrato. */
  orientation: OrientationMode;
  /** Permite girar a tela livremente dentro do player. */
  playerAutoRotate: boolean;
  /** Formato do stream para servidores Xtream. */
  streamFormat: StreamFormat;
  /** Atualizar lista e EPG automaticamente a cada N horas (0 = desligado). */
  autoRefreshHours: 0 | 12 | 24;
  /** Baixar o guia completo (XMLTV) do servidor automaticamente. Padrão: não. */
  fullEpgAuto: boolean;
  /** Procurar nova versão do app ao abrir. Padrão: sim. */
  autoCheckUpdates: boolean;
  setOrientation: (v: OrientationMode) => void;
  setPlayerAutoRotate: (v: boolean) => void;
  setStreamFormat: (v: StreamFormat) => void;
  setAutoRefreshHours: (v: 0 | 12 | 24) => void;
  setFullEpgAuto: (v: boolean) => void;
  setAutoCheckUpdates: (v: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      orientation: 'portrait',
      playerAutoRotate: false,
      // O iOS não toca MPEG-TS puro; HLS funciona nos dois.
      streamFormat: Platform.OS === 'ios' ? 'm3u8' : 'ts',
      autoRefreshHours: 24,
      fullEpgAuto: false,
      autoCheckUpdates: true,
      setOrientation: (orientation) => set({ orientation }),
      setPlayerAutoRotate: (playerAutoRotate) => set({ playerAutoRotate }),
      setStreamFormat: (streamFormat) => set({ streamFormat }),
      setAutoRefreshHours: (autoRefreshHours) => set({ autoRefreshHours }),
      setFullEpgAuto: (fullEpgAuto) => set({ fullEpgAuto }),
      setAutoCheckUpdates: (autoCheckUpdates) => set({ autoCheckUpdates }),
    }),
    { name: 'settings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
