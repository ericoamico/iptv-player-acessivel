import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSettings } from '../store/settingsStore';
import { useUpdates } from '../store/updateStore';

const MIN_INTERVAL_MS = 6 * 3_600_000;

/** Procura atualização ao abrir o app e ao voltar para ele (no máximo a cada 6 h). */
export function useAutoUpdateCheck() {
  const enabled = useSettings((s) => s.autoCheckUpdates);
  useEffect(() => {
    if (!enabled) return;
    const maybeCheck = () => {
      const { lastCheck, check } = useUpdates.getState();
      if (!lastCheck || Date.now() - lastCheck > MIN_INTERVAL_MS) check(true);
    };
    // Pequeno atraso para não competir com a abertura do app.
    const t = setTimeout(maybeCheck, 4000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && maybeCheck());
    return () => {
      clearTimeout(t);
      sub.remove();
    };
  }, [enabled]);
}
