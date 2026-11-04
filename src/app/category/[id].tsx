import { router, Stack, useLocalSearchParams } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View, type ListViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { nowAndNext } from '../../api/epg';
import { StatusView } from '../../components/StatusView';
import { TextField } from '../../components/TextField';
import { useNow } from '../../hooks/useNow';
import { useCategoryChannels, useFavoriteKeys } from '../../hooks/useChannels';
import { useAuth } from '../../store/authStore';
import { FAVORITES_ID, favKey, useFavorites } from '../../store/favoritesStore';
import { programmesFor, useEpg } from '../../store/epgStore';
import { usePlaylist } from '../../store/playlistStore';
import { colors, font, MIN_TOUCH, spacing } from '../../theme';
import type { Channel, Programme } from '../../types';
import { describeNow } from '../../utils/epgText';
import { announce, plural } from '../../utils/a11y';
import { normalizeName } from '../../utils/text';

const ChannelRow = memo(function ChannelRow({
  channel,
  programmes,
  now,
  categoryId,
  favorite,
  position,
  total,
}: {
  channel: Channel;
  programmes?: Programme[];
  now: number;
  categoryId: string;
  favorite: boolean;
  /** Posição (0..n-1) quando a lista é a de favoritos; habilita mover. */
  position?: number;
  total?: number;
}) {
  const { now: current, next } = nowAndNext(programmes, now);
  const epgText = describeNow(current, next);
  const prefix = channel.number != null ? `${channel.number}. ` : '';
  const openPlayer = () => router.push({ pathname: '/player/[id]', params: { id: channel.id, categoryId } });
  const openEpg = () => router.push({ pathname: '/epg/[id]', params: { id: channel.id, categoryId } });
  const toggleFav = () => toggleFavorite(channel);
  const move = (delta: number) => moveFavorite(channel, delta);
  const reorderable = position != null && total != null && total > 1;

  return (
    <Pressable
      onPress={openPlayer}
      onLongPress={openEpg}
      accessibilityRole="button"
      accessibilityLabel={`${prefix}${channel.name}${favorite && position == null ? ', favorito' : ''}. ${epgText}`}
      accessibilityHint="Toque duas vezes para assistir. Mais ações no menu de ações."
      // Ações personalizadas: no TalkBack aparecem ao deslizar para cima ou para baixo
      // (controle de leitura "Ações") e no menu de ações; no VoiceOver, no rotor.
      accessibilityActions={[
        { name: 'activate', label: 'Assistir' },
        { name: 'watch', label: 'Assistir' },
        { name: 'epg', label: 'Ver programação' },
        { name: 'fav', label: favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos' },
        ...(reorderable && position > 0 ? [{ name: 'up', label: 'Mover para cima' }] : []),
        ...(reorderable && position < total - 1 ? [{ name: 'down', label: 'Mover para baixo' }] : []),
      ]}
      onAccessibilityAction={(e) => {
        const action = e.nativeEvent.actionName;
        if (action === 'activate' || action === 'watch') openPlayer();
        else if (action === 'epg') openEpg();
        else if (action === 'fav') toggleFav();
        else if (action === 'up') move(-1);
        else if (action === 'down') move(1);
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
      {/* Estrela para quem enxerga; leitores de tela usam a ação "Adicionar aos favoritos". */}
      <Pressable
        onPress={toggleFav}
        hitSlop={8}
        style={styles.star}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Text style={[styles.starText, favorite && styles.starOn]}>{favorite ? '★' : '☆'}</Text>
      </Pressable>
    </Pressable>
  );
});

function toggleFavorite(channel: Channel) {
  const account = useAuth.getState().account;
  if (!account) return;
  const added = useFavorites.getState().toggle(account, channel);
  announce(added ? `${channel.name} adicionado aos favoritos.` : `${channel.name} removido dos favoritos.`);
}

function moveFavorite(channel: Channel, delta: number) {
  const account = useAuth.getState().account;
  if (!account) return;
  const pos = useFavorites.getState().move(account, channel, delta);
  if (pos != null) announce(`${channel.name} movido para a posição ${pos}.`);
}

// Busca o "agora / a seguir" só dos canais que estão visíveis na tela.
// (Fora do componente: a FlatList exige que estes valores nunca mudem.)
const viewabilityConfig = { itemVisiblePercentThreshold: 50, minimumViewTime: 250 };
function onViewableItemsChanged({ viewableItems }: { viewableItems: ListViewToken[] }) {
  const account = useAuth.getState().account;
  if (!account) return;
  for (const v of viewableItems) if (v.item) useEpg.getState().requestShort(account, v.item as Channel);
}

export default function ChannelsScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const isFavorites = id === FAVORITES_ID;
  const channels = useCategoryChannels(id);
  const favoriteKeys = useFavoriteKeys();
  const favSet = useMemo(() => new Set(favoriteKeys), [favoriteKeys]);
  const categoryName = usePlaylist(
    (s) => (isFavorites ? 'Favoritos' : (name ?? s.playlist?.categories.find((c) => c.id === id)?.name ?? 'Canais')),
  );
  const guide = useEpg((s) => s.guide);
  const short = useEpg((s) => s.short);
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
          renderItem={({ item, index }) => (
            <ChannelRow
              channel={item}
              programmes={programmesFor({ guide, short }, item.id)}
              now={now}
              categoryId={id}
              favorite={favSet.has(favKey(item))}
              position={isFavorites && !query ? index : undefined}
              total={isFavorites && !query ? filtered.length : undefined}
            />
          )}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
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
          ListEmptyComponent={
            <StatusView
              message={
                isFavorites && !query
                  ? 'Nenhum favorito ainda. Na lista de canais ou no player, use a ação “Adicionar aos favoritos”, ou toque na estrela.'
                  : 'Nenhum canal encontrado.'
              }
            />
          }
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
  star: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  starText: { fontSize: 26, color: colors.textMuted },
  starOn: { color: colors.focus },
});
