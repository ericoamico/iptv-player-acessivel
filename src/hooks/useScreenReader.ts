import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** true quando TalkBack ou VoiceOver estão ativos. */
export function useScreenReader(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled().then((v) => mounted && setEnabled(v));
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return enabled;
}
