import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, font, MIN_TOUCH } from '../theme';

interface Props {
  label: string;
  accessibilityLabel?: string;
  hint?: string;
  onPress: () => void;
}

export function HeaderButton({ label, accessibilityLabel, hint, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={hint}
      hitSlop={8}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.text} maxFontSizeMultiplier={1.6}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: 8 },
  text: { color: colors.text, fontSize: font.body, fontWeight: '600' },
});
