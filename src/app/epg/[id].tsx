import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { xtreamShortEpg } from '../../api/xtream';
import { AppButton } from '../../components/AppButton';
import { StatusView } from '../../components/StatusView';
import { useNow } from '../../hooks/useNow';
import { useAuth } from '../../store/authStore';
import { useEpg } from '../../store/epgStore';
import { usePlaylist } from '../../store/playlistStore';
import { colors, font, spacing } from '../../theme';
import type { Programme } from '../../types';
import { formatDayLabel, formatHour } from '../../utils/time';

export default function ChannelEpgScreen() {
  const { id, categoryId } = useLocalSearchParams<{ id: string; categoryId?: string }>();
  const account = useAuth((s) => s.account);
  const channel = usePlaylist((s) => s.byId[id]);
  const cached = useEpg((s) => s.guide[id]);
  const now = useNow(60_000);
  // Sem dados no XMLTV? Busca o EPG curto direto da API Xtream.
  const streamId = channel?.streamId;
  const needsFallback = !cached?.length && account?.type === 'xtream' && streamId != null;
  const [fallback, setFallback] = useState<{ id: string; list: Programme[] } | null>(null);
  useEffect(() => {
    if (!needsFallback || !account) return;
    let alive = true;
    xtreamShortEpg(account, streamId!, 30)
      .then((list) => alive && setFallback({ id, list }))
      .catch(() => alive && setFallback({ id, list: [] }));
    return () => {
      alive = false;
    };
  }, [needsFallback, account, streamId, id]);
  const loading = needsFallback && fallback?.id !== id;

  const programmes = useMemo(
    () => (cached?.length ? cached : fallback?.id === id ? fallback.list : []),
    [cached, fallback, id],
  );

  const sections = useMemo(() => {
    const upcoming = programmes.filter((p) => p.stop > now);
    const groups = new Map<string, Programme[]>();
    for (const p of upcoming) {
      const label = formatDayLabel(p.start, now);
      const list = groups.get(label);
      if (list) list.push(p);
      else groups.set(label, [p]);
    }
    return [...groups].map(([title, data]) => ({ title, data }));
  }, [programmes, now]);

  if (!channel) return <StatusView message="Canal não encontrado." />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ title: `Programação: ${channel.name}` }} />
      <SectionList
        sections={sections}
        keyExtractor={(p) => `${p.start}-${p.title}`}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.top}>
            <Text accessibilityRole="header" style={styles.title}>
              Programação de {channel.name}
            </Text>
            <AppButton
              label="Assistir este canal"
              onPress={() => router.push({ pathname: '/player/[id]', params: { id: channel.id, categoryId: categoryId ?? '' } })}
            />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text accessibilityRole="header" style={styles.day}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => {
          const live = item.start <= now && item.stop > now;
          const time = `${formatHour(item.start)} às ${formatHour(item.stop)}`;
          return (
            <View
              style={[styles.item, live && styles.itemLive]}
              accessible
              accessibilityLabel={`${live ? 'No ar agora. ' : ''}${time}: ${item.title}. ${item.description ?? ''}`}
            >
              <Text style={styles.time}>
                {live ? 'AGORA · ' : ''}
                {time}
              </Text>
              <Text style={styles.progTitle}>{item.title}</Text>
              {item.description ? (
                <Text style={styles.desc} numberOfLines={3}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <StatusView
            loading={loading}
            message={loading ? 'Buscando programação…' : 'Não há programação disponível para este canal.'}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  top: { padding: spacing.md, gap: spacing.md },
  title: { color: colors.text, fontSize: font.title, fontWeight: '700' },
  day: {
    color: colors.text,
    fontSize: font.large,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  item: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  itemLive: { borderWidth: 2, borderColor: colors.focus },
  time: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
  progTitle: { color: colors.text, fontSize: font.body, fontWeight: '600', marginTop: 2 },
  desc: { color: colors.textMuted, fontSize: font.small, marginTop: spacing.xs },
});
