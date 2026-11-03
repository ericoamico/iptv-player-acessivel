import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, MIN_TOUCH, spacing } from '../theme';

export interface RadioOption<T extends string | number> {
  value: T;
  label: string;
  description?: string;
}

interface Props<T extends string | number> {
  title: string;
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function RadioGroup<T extends string | number>({ title, options, value, onChange }: Props<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={title} style={styles.group}>
      <Text style={styles.title} importantForAccessibility="no" accessibilityElementsHidden>
        {title}
      </Text>
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, selected }}
            accessibilityLabel={`${title}: ${o.label}${o.description ? `. ${o.description}` : ''}, ${i + 1} de ${options.length}`}
            style={({ pressed }) => [styles.option, pressed && styles.pressed, selected && styles.selected]}
          >
            <View style={[styles.circle, selected && styles.circleOn]}>{selected ? <View style={styles.dot} /> : null}</View>
            <View style={styles.texts}>
              <Text style={styles.label}>{o.label}</Text>
              {o.description ? <Text style={styles.desc}>{o.description}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: spacing.md },
  title: { color: colors.text, fontSize: font.body, fontWeight: '600', marginBottom: spacing.sm },
  option: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  pressed: { backgroundColor: colors.surfacePressed },
  selected: { borderColor: colors.focus, borderWidth: 2 },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  circleOn: { borderColor: colors.focus },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.focus },
  texts: { flex: 1 },
  label: { color: colors.text, fontSize: font.body },
  desc: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
});
