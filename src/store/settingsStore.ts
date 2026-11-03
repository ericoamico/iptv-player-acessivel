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
  setOrientation: (v: OrientationMode) => void;
  setPlayerAutoRotate: (v: boolean) => void;
  setStreamFormat: (v: StreamFormat) => void;
  setAutoRefreshHours: (v: 0 | 12 | 24) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      orientation: 'portrait',
      playerAutoRotate: false,
      // O iOS não toca MPEG-TS puro; HLS funciona nos dois.
      streamFormat: Platform.OS === 'ios' ? 'm3u8' : 'ts',
      autoRefreshHours: 24,
      setOrientation: (orientation) => set({ orientation }),
      setPlayerAutoRotate: (playerAutoRotate) => set({ playerAutoRotate }),
      setStreamFormat: (streamFormat) => set({ streamFormat }),
      setAutoRefreshHours: (autoRefreshHours) => set({ autoRefreshHours }),
    }),
    { name: 'settings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
