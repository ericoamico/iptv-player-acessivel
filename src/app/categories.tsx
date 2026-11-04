import { router, Stack } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { HeaderButton } from '../components/HeaderButton';
import { StatusView } from '../components/StatusView';
import { useDataSync } from '../hooks/useDataSync';
import { usePlaylist } from '../store/playlistStore';
import { colors, font, MIN_TOUCH, spacing } from '../theme';
import type { Category } from '../types';
import { plural } from '../utils/a11y';
import { formatDateTime } from '../utils/time';

export default function CategoriesScreen() {
  const { playlist, loading, error } = usePlaylist();
  const { refreshPlaylist } = useDataSync();

  const header = (
    <Stack.Screen
      options={{
        title: 'Categorias',
        headerRight: () => (
          <HeaderButton label="Ajustes" accessibilityLabel="Configurações" onPress={() => router.push('/settings')} />
        ),
      }}
    />
  );

  if (!playlist) {
    return (
      <>
        {header}
        {loading || !error ? (
          <StatusView loading message="Carregando lista de canais…" />
        ) : (
          <StatusView message={`Não foi possível carregar a lista. ${error}`} actionLabel="Tentar novamente" onAction={refreshPlaylist} />
        )}
      </>
    );
  }

  const renderItem = ({ item }: { item: Category }) => (
    <Pressable
      onPress={() => router.push({ pathname: '/category/[id]', params: { id: item.id, name: item.name } })}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${plural(item.channelCount, 'canal', 'canais')}`}
      accessibilityHint="Abre os canais desta categoria"
      accessibilityActions={[
        { name: 'activate', label: 'Abrir categoria' },
        { name: 'open', label: 'Abrir categoria' },
        { name: 'refresh', label: 'Atualizar lista' },
      ]}
      onAccessibilityAction={(e) => {
        const action = e.nativeEvent.actionName;
        if (action === 'refresh') refreshPlaylist();
        else router.push({ pathname: '/category/[id]', params: { id: item.id, name: item.name } });
      }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Text style={styles.rowTitle} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.rowCount}>{item.channelCount}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      {header}
      <FlatList
        data={playlist.categories}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshPlaylist} tintColor={colors.text} accessibilityLabel="Atualizar lista" />
        }
        ListHeaderComponent={
          <View style={styles.top}>
            <Text style={styles.summary}>
              {plural(playlist.channels.length, 'canal', 'canais')} em {plural(playlist.categories.length, 'categoria', 'categorias')}.
              {'\n'}Atualizado em {formatDateTime(playlist.updatedAt)}.
            </Text>
            <AppButton
              label="Atualizar lista"
              variant="secondary"
              onPress={refreshPlaylist}
              busy={loading}
              hint="Baixa novamente as categorias e os canais do servidor"
            />
            {error ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={<StatusView message="Nenhuma categoria encontrada nesta lista." />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  top: { padding: spacing.md, gap: spacing.md },
  summary: { color: colors.textMuted, fontSize: font.body },
  error: { color: colors.error, fontSize: font.body },
  row: {
    minHeight: Math.max(MIN_TOUCH, 64),
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  rowPressed: { backgroundColor: colors.surfacePressed },
  rowTitle: { flex: 1, color: colors.text, fontSize: font.body, fontWeight: '600' },
  rowCount: { color: colors.textMuted, fontSize: font.body, marginLeft: spacing.md },
  sep: { height: 1, backgroundColor: colors.border },
});
