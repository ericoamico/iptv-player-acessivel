import { StyleSheet, Text } from 'react-native';

import { colors, font, spacing } from '../theme';

/** Título de seção navegável por cabeçalhos no leitor de tela. */
export function SectionHeader({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={styles.h}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  h: { color: colors.text, fontSize: font.large, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
});
