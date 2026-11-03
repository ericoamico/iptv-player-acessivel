import type { Ref } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { colors, font, MIN_TOUCH, spacing } from '../theme';

interface Props extends Omit<TextInputProps, 'ref'> {
  ref?: Ref<TextInputInstance>;
  label: string;
  hint?: string;
  error?: string | null;
}

/** Campo com rótulo visível ligado ao input e erro anunciado. */
export function TextField({ label, hint, error, style, ref, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label} importantForAccessibility="no" accessibilityElementsHidden>
        {label}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, !!error && styles.inputError, style]}
        autoCorrect={false}
        {...rest}
      />
      {hint ? (
        <Text style={styles.hint} importantForAccessibility="no" accessibilityElementsHidden>
          {hint}
        </Text>
      ) : null}
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { color: colors.text, fontSize: font.body, fontWeight: '600', marginBottom: spacing.xs },
  input: {
    minHeight: MIN_TOUCH,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: font.body,
  },
  inputError: { borderColor: colors.error, borderWidth: 2 },
  hint: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.xs },
  error: { color: colors.error, fontSize: font.small, marginTop: spacing.xs, fontWeight: '600' },
});
