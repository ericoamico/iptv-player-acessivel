import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, font, spacing } from '../theme';
import { AppButton } from './AppButton';

interface Props {
  loading?: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Estado de carregamento, erro ou lista vazia, anunciado ao leitor de tela. */
export function StatusView({ loading, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      {loading ? <ActivityIndicator size="large" color={colors.text} accessibilityElementsHidden importantForAccessibility="no" /> : null}
      <Text style={styles.text} accessibilityLiveRegion="polite" accessibilityRole={loading ? 'progressbar' : 'text'}>
        {message}
      </Text>
      {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} style={styles.button} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  text: { color: colors.text, fontSize: font.body, textAlign: 'center', marginTop: spacing.md },
  button: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
