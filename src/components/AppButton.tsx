import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, font, MIN_TOUCH, spacing } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  /** Texto lido pelo leitor de tela, se diferente do visível. */
  accessibilityLabel?: string;
  hint?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export function AppButton({ label, onPress, accessibilityLabel, hint, variant = 'primary', disabled, busy, style, compact }: Props) {
  const bg = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : colors.surface;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: pressed ? (variant === 'secondary' ? colors.surfacePressed : colors.primaryPressed) : bg },
        variant === 'secondary' && styles.outline,
        (disabled || busy) && styles.disabled,
        style,
      ]}
    >
      <Text style={styles.label} maxFontSizeMultiplier={2}>
        {busy ? 'Aguarde…' : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm },
  outline: { borderWidth: 1, borderColor: colors.border },
  disabled: { opacity: 0.55 },
  label: { color: colors.text, fontSize: font.body, fontWeight: '600', textAlign: 'center' },
});
