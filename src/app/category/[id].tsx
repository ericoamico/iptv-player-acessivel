import { router, Stack, useLocalSearchParams } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { FlatList, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { nowAndNext } from '../../api/epg';
import { StatusView } from '../../components/StatusView';
import { TextField } from '../../components/TextField';
import { useNow } from '../../hooks/useNow';
import { useEpg } from '../../store/epgStore';
import { usePlaylist } from '../../store/playlistStore';
import { colors, font, MIN_TOUCH, spacing } from '../../theme';
import type { Channel, Programme } from '../../types';
import { describeNow } from '../../utils/epgText';
import { plural } from '../../utils/a11y';
import { normalizeName } from '../../utils/text';

const ChannelRow = memo(function ChannelRow({
  channel,
  programmes,
  now,
  categoryId,
}: {
  channel: Channel;
  programmes?: Programme[];
  now: number;
  categoryId: string;
}) {
  const { now: current, next } = nowAndNext(programmes, now);
  const epgText = describeNow(current, next);
  const prefix = channel.number != null ? `${channel.number}. ` : '';
  const openPlayer = () => router.push({ pathname: '/player/[id]', params: { id: channel.id, categoryId } });
  const openEpg = () => router.push({ pathname: '/epg/[id]', params: { id: channel.id, categoryId } });

  return (
    <Pressable
      onPress={openPlayer}
      onLongPress={openEpg}
      accessibilityRole="button"
      accessibilityLabel={`${prefix}${channel.name}. ${epgText}`}
      accessibilityHint="Toque duas vezes para assistir. Use as ações para ver a programação."
      accessibilityActions={[
        { name: 'activate', label: 'Assistir' },
        // Android: ação "toque longo"; iOS: ação personalizada no rotor do VoiceOver.
        Platform.OS === 'android' ? { name: 'longpress', label: 'Ver programação' } : { name: 'epg', label: 'Ver programação' },
      ]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'activate') openPlayer();
        else openEpg();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {channel.logo ? (
        <Image source={{ uri: channel.logo }} style={styles.logo} resizeMode="contain" accessible={false} importantForAccessibility="no" />
      ) : (
        <View style={[styles.logo, styles.logoEmpty]} importantForAccessibility="no" />
      )}
      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={2}>
          {prefix}
          {channel.name}
        </Text>
        <Text style={styles.epg} numberOfLines={2}>
          {epgText}
        </Text>
      </View>
    </Pressable>
  );
});

export default function ChannelsScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const channels = usePlaylist((s) => s.byCategory[id]);
  const categoryName = usePlaylist((s) => name ?? s.playlist?.categories.find((c) => c.id === id)?.name ?? 'Canais');
  const guide = useEpg((s) => s.guide);
  const now = useNow();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!channels) return [];
    const q = normalizeName(query);
    return q ? channels.filter((c) => normalizeName(c.name).includes(q)) : channels;
  }, [channels, query]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ title: categoryName }} />
      {!channels ? (
        <StatusView message="Categoria não encontrada. Volte e atualize a lista." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ChannelRow channel={item} programmes={guide[item.id]} now={now} categoryId={id} />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={15}
          windowSize={11}
          ListHeaderComponent={
            <View style={styles.top}>
              <Text accessibilityRole="header" style={styles.title}>
                {categoryName}
              </Text>
              <Text style={styles.count} accessibilityLiveRegion="polite">
                {query ? `${plural(filtered.length, 'canal encontrado', 'canais encontrados')}` : plural(channels.length, 'canal', 'canais')}
              </Text>
              <TextField
                label="Buscar canal nesta categoria"
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
          }
          ListEmptyComponent={<StatusView message="Nenhum canal encontrado." />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  top: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  title: { color: colors.text, fontSize: font.title, fontWeight: '700' },
  count: { color: colors.textMuted, fontSize: font.body, marginBottom: spacing.md },
  row: {
    minHeight: Math.max(MIN_TOUCH, 72),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowPressed: { backgroundColor: colors.surfacePressed },
  logo: { width: 56, height: 40, marginRight: spacing.md, borderRadius: 4 },
  logoEmpty: { backgroundColor: colors.surface },
  texts: { flex: 1 },
  name: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  epg: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  sep: { height: 1, backgroundColor: colors.border },
});
