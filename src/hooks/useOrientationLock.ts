import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';

import { useSettings, type OrientationMode } from '../store/settingsStore';

export async function applyOrientation(mode: OrientationMode) {
  try {
    if (mode === 'portrait') await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    else if (mode === 'landscape') await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    else await ScreenOrientation.unlockAsync();
  } catch {
    // Alguns dispositivos (ex.: iPad em multitarefa) não permitem travar.
  }
}

/** Aplica o modo de tela escolhido nas configurações (padrão: retrato). */
export function useOrientationFromSettings() {
  const mode = useSettings((s) => s.orientation);
  useEffect(() => {
    applyOrientation(mode);
  }, [mode]);
}
