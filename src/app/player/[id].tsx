import { useEvent } from 'expo';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { VideoView, useVideoPlayer, type VideoSource } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { nowAndNext } from '../../api/epg';
import { AppButton } from '../../components/AppButton';
import { StatusView } from '../../components/StatusView';
import { applyOrientation } from '../../hooks/useOrientationLock';
import { useNow } from '../../hooks/useNow';
import { useCategoryChannels, useFavoriteKeys } from '../../hooks/useChannels';
import { useScreenReader } from '../../hooks/useScreenReader';
import { favKey, useFavorites } from '../../store/favoritesStore';
import { useAuth } from '../../store/authStore';
import { programmesFor, useEpg } from '../../store/epgStore';
import { streamUrlFor, usePlaylist } from '../../store/playlistStore';
import { useSettings, type StreamFormat } from '../../store/settingsStore';
import { colors, font, spacing } from '../../theme';
import { announce } from '../../utils/a11y';
import { describeNow } from '../../utils/epgText';
import { formatHour } from '../../utils/time';

const HIDE_CONTROLS_MS = 5000;

export default function PlayerScreen() {
  const params = useLocalSearchParams<{ id: string; categoryId?: string }>();
  const account = useAuth((s) => s.account);
  const byId = usePlaylist((s) => s.byId);
  const siblings = useCategoryChannels(params.categoryId || undefined);
  const settingsFormat = useSettings((s) => s.streamFormat);
  const autoRotate = useSettings((s) => s.playerAutoRotate);
  const appOrientation = useSettings((s) => s.orientation);
  const screenReader = useScreenReader();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const now = useNow();

  const [channelId, setChannelId] = useState(params.id);
  const [format, setFormat] = useState<StreamFormat>(settingsFormat);
  const [retryKey, setRetryKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const announced = useRef<string | null>(null);

  const channel = byId[channelId];
  const favoriteKeys = useFavoriteKeys();
  const isFavorite = !!channel && favoriteKeys.includes(favKey(channel));
  const toggleFavorite = () => {
    if (!account || !channel) return;
    const added = useFavorites.getState().toggle(account, channel);
    announce(added ? `${channel.name} adicionado aos favoritos.` : `${channel.name} removido dos favoritos.`);
  };
  const programmes = useEpg((s) => programmesFor(s, channelId));
  useEffect(() => {
    if (account && channel) useEpg.getState().requestShort(account, channel);
  }, [account, channel]);
  const { now: current, next } = nowAndNext(programmes, now);

  const url = account && channel ? streamUrlFor(account, channel, format) : '';
  const source = useMemo<VideoSource>(
    () =>
      url
        ? {
            uri: url,
            contentType: /\.m3u8(\?|$)/i.test(url) ? 'hls' : 'auto',
            metadata: { title: channel?.name },
            // retryKey força uma nova carga ao "Tentar novamente".
            headers: retryKey ? { 'X-Retry': String(retryKey) } : undefined,
          }
        : null,
    [url, channel?.name, retryKey],
  );

  const player = useVideoPlayer(source, (p) => {
    p.keepScreenOnWhilePlaying = true;
    p.play();
  });

  const { status, error } = useEvent(player, 'statusChange', { status: player.status });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  // Ao trocar de canal (o hook troca a fonte sozinho), volta a tocar.
  useEffect(() => {
    announced.current = null;
    if (url) player.play();
  }, [url, retryKey, player]);

  // Anúncios para o leitor de tela.
  useEffect(() => {
    if (!channel) return;
    const key = `${channel.id}:${status}`;
    if (announced.current === key) return;
    if (status === 'loading') announce(`Carregando ${channel.name}…`);
    else if (status === 'readyToPlay') announce(`Reproduzindo ${channel.name}. ${describeNow(current, next)}`);
    else if (status === 'error') announce(`Não foi possível reproduzir ${channel.name}.`);
    else return;
    announced.current = key;
  }, [status, channel, current, next]);

  // Orientação dentro do player.
  useEffect(() => {
    if (fullscreen) ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    else if (autoRotate) ScreenOrientation.unlockAsync().catch(() => {});
    else applyOrientation(appOrientation);
  }, [fullscreen, autoRotate, appOrientation]);
  useEffect(() => () => void applyOrientation(useSettings.getState().orientation), []);

  // Controles somem sozinhos em paisagem, exceto com leitor de tela ativo.
  const [interaction, setInteraction] = useState(0);
  const showControls = useCallback(() => {
    setControlsVisible(true);
    setInteraction((n) => n + 1);
  }, []);
  useEffect(() => {
    if (!controlsVisible || screenReader || !isLandscape) return;
    const t = setTimeout(() => setControlsVisible(false), HIDE_CONTROLS_MS);
    return () => clearTimeout(t);
  }, [controlsVisible, screenReader, isLandscape, interaction]);

  const index = siblings ? siblings.findIndex((c) => c.id === channelId) : -1;
  const canZap = !!siblings && siblings.length > 1 && index >= 0;
  const zap = (delta: number) => {
    if (!siblings || index < 0) return;
    const target = siblings[(index + delta + siblings.length) % siblings.length];
    setChannelId(target.id);
    setFormat(settingsFormat);
    showControls();
  };

  const togglePlay = () => {
    if (isPlaying) player.pause();
    else player.play();
    showControls();
  };

  if (!account || !channel) {
    return <StatusView message="Canal não encontrado." actionLabel="Voltar" onAction={() => router.back()} />;
  }

  const nowText = describeNow(current, next);
  const canSwitchFormat = channel.streamId != null;
  const statusText =
    status === 'loading' ? 'Carregando…' : status === 'error' ? 'Erro ao reproduzir' : isPlaying ? 'Reproduzindo' : 'Pausado';

  // Ações do TalkBack/VoiceOver no título do canal: deslizar para cima/baixo
  // (controle "Ações") escolhe, toque duplo executa. Evita procurar cada botão.
  const openEpg = () =>
    router.push({ pathname: '/epg/[id]', params: { id: channel.id, categoryId: params.categoryId ?? '' } });
  const a11yActions = [
    ...(canZap ? [{ name: 'next', label: 'Próximo canal' }, { name: 'prev', label: 'Canal anterior' }] : []),
    status === 'error'
      ? { name: 'retry', label: 'Tentar novamente' }
      : { name: 'toggle', label: isPlaying ? 'Pausar' : 'Reproduzir' },
    { name: 'epg', label: 'Ver programação' },
    { name: 'fav', label: isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos' },
    fullscreen ? { name: 'fullscreen', label: 'Sair da tela cheia' } : { name: 'fullscreen', label: 'Tela cheia' },
    { name: 'info', label: 'O que está passando' },
  ];
  const onA11yAction = (e: { nativeEvent: { actionName: string } }) => {
    switch (e.nativeEvent.actionName) {
      case 'next':
        return zap(1);
      case 'prev':
        return zap(-1);
      case 'toggle':
        return togglePlay();
      case 'retry':
        return setRetryKey((k) => k + 1);
      case 'epg':
        return openEpg();
      case 'fav':
        return toggleFavorite();
      case 'fullscreen':
        return setFullscreen((f) => !f);
      case 'info':
        return announce(`${channel.name}. ${statusText}. ${nowText}${next && current ? `. A seguir: ${next.title}, às ${formatHour(next.start)}` : ''}`);
    }
  };
  const titleA11y = {
    accessible: true,
    accessibilityRole: 'header' as const,
    accessibilityLabel: `${channel.number != null ? `${channel.number}. ` : ''}${channel.name}${isFavorite ? ', favorito' : ''}`,
    accessibilityHint: 'Mais ações no menu de ações: trocar de canal, pausar, programação e tela cheia.',
    accessibilityActions: a11yActions,
    onAccessibilityAction: onA11yAction,
  };

  const controls = (
    <View style={styles.controlsRow}>
      {canZap ? <AppButton label="◀ Anterior" accessibilityLabel="Canal anterior" variant="secondary" compact onPress={() => zap(-1)} style={styles.ctrl} /> : null}
      <AppButton
        label={isPlaying ? 'Pausar' : 'Reproduzir'}
        onPress={togglePlay}
        compact
        style={styles.ctrl}
        disabled={status === 'error'}
      />
      {canZap ? <AppButton label="Próximo ▶" accessibilityLabel="Próximo canal" variant="secondary" compact onPress={() => zap(1)} style={styles.ctrl} /> : null}
    </View>
  );

  const errorBox =
    status === 'error' ? (
      <View style={styles.errorBox}>
        <Text style={styles.errorText} accessibilityRole="alert">
          Não foi possível reproduzir este canal. {error?.message ? `Detalhe: ${error.message}` : ''}
        </Text>
        <View style={styles.controlsRow}>
          <AppButton label="Tentar novamente" compact onPress={() => setRetryKey((k) => k + 1)} style={styles.ctrl} />
          {canSwitchFormat ? (
            <AppButton
              label={`Tentar formato ${format === 'ts' ? 'HLS' : 'TS'}`}
              variant="secondary"
              compact
              onPress={() => setFormat(format === 'ts' ? 'm3u8' : 'ts')}
              style={styles.ctrl}
            />
          ) : null}
        </View>
      </View>
    ) : null;

  const video = (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="contain"
      nativeControls={false}
      allowsPictureInPicture
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );

  // ---------- Paisagem: vídeo em tela inteira com controles sobrepostos ----------
  if (isLandscape) {
    return (
      <View style={styles.landscape}>
        <Stack.Screen options={{ headerShown: false, title: channel.name }} />
        <StatusBar hidden />
        {video}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => (controlsVisible ? setControlsVisible(false) : showControls())}
          accessibilityRole="button"
          accessibilityLabel={controlsVisible ? 'Esconder controles' : 'Mostrar controles'}
          importantForAccessibility={screenReader ? 'no-hide-descendants' : 'auto'}
          accessibilityElementsHidden={screenReader}
        />
        {controlsVisible || screenReader ? (
          <SafeAreaView style={styles.overlay} pointerEvents="box-none" edges={['top', 'bottom', 'left', 'right']}>
            <View style={styles.overlayTop}>
              <AppButton label="Voltar" variant="secondary" compact onPress={() => router.back()} />
              {fullscreen ? (
                <AppButton label="Sair da tela cheia" variant="secondary" compact onPress={() => setFullscreen(false)} />
              ) : null}
            </View>
            <View style={styles.overlayBottom}>
              <Text {...titleA11y} style={styles.overlayTitle} numberOfLines={1}>
                {channel.name}
              </Text>
              <Text style={styles.overlayEpg} numberOfLines={2}>
                {statusText}. {nowText}
              </Text>
              {errorBox}
              {controls}
            </View>
          </SafeAreaView>
        ) : null}
      </View>
    );
  }

  // ---------- Retrato: vídeo no topo, informações e controles abaixo ----------
  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: true, title: channel.name }} />
      <StatusBar style="light" hidden={false} />
      <View style={styles.videoBox}>{video}</View>
      <ScrollView contentContainerStyle={styles.info}>
        <Text {...titleA11y} style={styles.title}>
          {channel.number != null ? `${channel.number}. ` : ''}
          {channel.name}
        </Text>
        <Text style={styles.status} accessibilityLiveRegion="polite">
          {statusText}
          {canZap ? ` · canal ${index + 1} de ${siblings!.length}` : ''}
        </Text>
        {current ? (
          <View style={styles.programme} accessible accessibilityLabel={`Agora, de ${formatHour(current.start)} até ${formatHour(current.stop)}: ${current.title}. ${current.description ?? ''}`}>
            <Text style={styles.progLabel}>
              Agora · {formatHour(current.start)} – {formatHour(current.stop)}
            </Text>
            <Text style={styles.progTitle}>{current.title}</Text>
            {current.description ? (
              <Text style={styles.progDesc} numberOfLines={4}>
                {current.description}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text style={styles.progDesc}>{nowText}</Text>
        )}
        {next && current ? (
          <Text style={styles.next} accessibilityLabel={`A seguir, às ${formatHour(next.start)}: ${next.title}`}>
            A seguir · {formatHour(next.start)} · {next.title}
          </Text>
        ) : null}
        {errorBox}
        {controls}
        <View style={styles.controlsRow}>
          <AppButton
            label="Tela cheia"
            variant="secondary"
            compact
            onPress={() => setFullscreen(true)}
            hint="Gira a tela para paisagem e amplia o vídeo"
            style={styles.ctrl}
          />
          <AppButton
            label={isFavorite ? '★ Remover dos favoritos' : '☆ Adicionar aos favoritos'}
            accessibilityLabel={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            variant="secondary"
            compact
            onPress={toggleFavorite}
            style={styles.ctrl}
          />
          <AppButton
            label="Programação"
            variant="secondary"
            compact
            onPress={openEpg}
            hint="Abre a programação completa deste canal"
            style={styles.ctrl}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  videoBox: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  info: { padding: spacing.md, gap: spacing.sm },
  title: { color: colors.text, fontSize: font.title, fontWeight: '700' },
  status: { color: colors.textMuted, fontSize: font.body },
  programme: { backgroundColor: colors.surface, borderRadius: 10, padding: spacing.md },
  progLabel: { color: colors.textMuted, fontSize: font.small },
  progTitle: { color: colors.text, fontSize: font.large, fontWeight: '600', marginTop: 2 },
  progDesc: { color: colors.textMuted, fontSize: font.body, marginTop: spacing.xs },
  next: { color: colors.textMuted, fontSize: font.body },
  controlsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  ctrl: { flexGrow: 1 },
  errorBox: { backgroundColor: '#3B1412', borderRadius: 10, padding: spacing.md },
  errorText: { color: colors.text, fontSize: font.body },
  landscape: { flex: 1, backgroundColor: '#000' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' },
  overlayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  overlayBottom: { backgroundColor: colors.overlay, padding: spacing.md },
  overlayTitle: { color: colors.text, fontSize: font.large, fontWeight: '700' },
  overlayEpg: { color: colors.text, fontSize: font.body, marginTop: 2 },
});
