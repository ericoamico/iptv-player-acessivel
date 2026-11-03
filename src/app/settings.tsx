import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { RadioGroup } from '../components/RadioGroup';
import { SectionHeader } from '../components/SectionHeader';
import { TextField } from '../components/TextField';
import { useDataSync } from '../hooks/useDataSync';
import { useAuth } from '../store/authStore';
import { useEpg } from '../store/epgStore';
import { usePlaylist } from '../store/playlistStore';
import { useSettings, type OrientationMode, type StreamFormat } from '../store/settingsStore';
import { colors, font, MIN_TOUCH, spacing } from '../theme';
import { announce, plural } from '../utils/a11y';
import { formatDate, formatDateTime } from '../utils/time';

export default function SettingsScreen() {
  const settings = useSettings();
  const account = useAuth((s) => s.account);
  const { playlist, loading: playlistLoading } = usePlaylist();
  const { updatedAt: epgUpdatedAt, loading: epgLoading, error: epgError, guide } = useEpg();
  const { refreshPlaylist, refreshEpg } = useDataSync();
  const [epgUrl, setEpgUrl] = useState(account?.epgUrl ?? '');

  const info = playlist?.accountInfo;

  async function saveEpgUrl() {
    if (!account) return;
    const value = epgUrl.trim();
    if (value && !/^https?:\/\//i.test(value)) {
      announce('O endereço do guia deve começar com http:// ou https://');
      Alert.alert('Endereço inválido', 'O endereço do guia deve começar com http:// ou https://');
      return;
    }
    await useAuth.getState().save({ ...account, epgUrl: value || undefined });
    announce(value ? 'Endereço do guia salvo.' : 'Endereço do guia removido. Será usado o guia do servidor.');
    refreshEpg(false);
  }

  function logout() {
    Alert.alert('Sair da conta', 'Os dados de acesso e a lista salva neste aparelho serão apagados.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await useAuth.getState().clear();
          usePlaylist.getState().reset();
          useEpg.getState().reset();
          announce('Você saiu da conta.');
          router.dismissAll();
          router.replace('/login');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader>Tela</SectionHeader>
        <RadioGroup<OrientationMode>
          title="Modo de tela"
          value={settings.orientation}
          onChange={(v) => {
            settings.setOrientation(v);
            announce(v === 'portrait' ? 'Tela em retrato.' : v === 'landscape' ? 'Tela em paisagem.' : 'Tela gira automaticamente.');
          }}
          options={[
            { value: 'portrait', label: 'Retrato', description: 'Padrão. Tela em pé.' },
            { value: 'landscape', label: 'Paisagem', description: 'Tela deitada.' },
            { value: 'auto', label: 'Automático', description: 'Acompanha a posição do aparelho.' },
          ]}
        />
        <View style={styles.switchRow}>
          <View style={styles.switchTexts} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Text style={styles.label}>Girar livremente no player</Text>
            <Text style={styles.muted}>Permite assistir em paisagem mesmo com o app em retrato.</Text>
          </View>
          <Switch
            value={settings.playerAutoRotate}
            onValueChange={settings.setPlayerAutoRotate}
            accessibilityLabel="Girar livremente no player"
            accessibilityHint="Permite assistir em paisagem mesmo com o app em retrato"
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.text}
          />
        </View>

        <SectionHeader>Lista de canais</SectionHeader>
        <Text style={styles.muted}>
          {playlist
            ? `${plural(playlist.channels.length, 'canal', 'canais')}. Atualizada em ${formatDateTime(playlist.updatedAt)}.`
            : 'Lista ainda não carregada.'}
        </Text>
        <AppButton label="Atualizar lista agora" onPress={refreshPlaylist} busy={playlistLoading} style={styles.gap} />
        <RadioGroup<0 | 12 | 24>
          title="Atualização automática"
          value={settings.autoRefreshHours}
          onChange={settings.setAutoRefreshHours}
          options={[
            { value: 24, label: 'A cada 24 horas' },
            { value: 12, label: 'A cada 12 horas' },
            { value: 0, label: 'Desligada', description: 'Atualize manualmente.' },
          ]}
        />

        <SectionHeader>Guia de programação (EPG)</SectionHeader>
        <Text style={styles.muted} accessibilityLiveRegion="polite">
          {epgLoading
            ? 'Atualizando guia…'
            : epgUpdatedAt
              ? `Guia completo: ${plural(Object.keys(guide).length, 'canal', 'canais')} com programação. Atualizado em ${formatDateTime(epgUpdatedAt)}.`
              : 'Guia completo não baixado.'}
        </Text>
        {epgError ? <Text style={styles.error}>{epgError}</Text> : null}
        <Text style={styles.muted}>
          Nos canais, o “agora / a seguir” é buscado no servidor só para os canais que aparecem na tela. O guia completo
          traz a programação de todos os canais de uma vez, mas costuma ser um arquivo grande e lento.
        </Text>
        <AppButton label="Baixar guia completo agora" onPress={() => refreshEpg(false)} busy={epgLoading} style={styles.gap} />
        <View style={styles.switchRow}>
          <View style={styles.switchTexts} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Text style={styles.label}>Baixar guia completo automaticamente</Text>
            <Text style={styles.muted}>Junto com a atualização da lista. Pode deixar o app lento em aparelhos simples.</Text>
          </View>
          <Switch
            value={settings.fullEpgAuto}
            onValueChange={settings.setFullEpgAuto}
            accessibilityLabel="Baixar guia completo automaticamente"
            accessibilityHint="Junto com a atualização da lista. Pode deixar o app lento em aparelhos simples."
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.text}
          />
        </View>
        <TextField
          label="Endereço do guia (opcional)"
          hint="Link XMLTV (.xml ou .xml.gz). Deixe vazio para usar o guia do servidor."
          value={epgUrl}
          onChangeText={setEpgUrl}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="http://…/guia.xml.gz"
        />
        <AppButton label="Salvar endereço do guia" variant="secondary" onPress={saveEpgUrl} />

        {account?.type === 'xtream' ? (
          <>
            <SectionHeader>Reprodução</SectionHeader>
            <RadioGroup<StreamFormat>
              title="Formato do vídeo"
              value={settings.streamFormat}
              onChange={settings.setStreamFormat}
              options={[
                { value: 'ts', label: 'TS', description: 'Recomendado no Android.' },
                { value: 'm3u8', label: 'HLS (m3u8)', description: 'Recomendado no iPhone. Use se algum canal não abrir.' },
              ]}
            />
          </>
        ) : null}

        <SectionHeader>Conta</SectionHeader>
        <View style={styles.card} accessible>
          {account?.type === 'xtream' ? (
            <>
              <Text style={styles.label}>Servidor: {account.server}</Text>
              <Text style={styles.label}>Usuário: {account.username}</Text>
            </>
          ) : (
            <Text style={styles.label}>Lista M3U: {account?.m3uUrl}</Text>
          )}
          {info?.status ? <Text style={styles.label}>Situação: {info.status === 'Active' ? 'Ativa' : info.status}</Text> : null}
          {info?.expiresAt ? <Text style={styles.label}>Válida até: {formatDate(info.expiresAt)}</Text> : null}
          {info?.maxConnections ? <Text style={styles.label}>Telas simultâneas: {info.maxConnections}</Text> : null}
        </View>
        <AppButton label="Sair da conta" variant="danger" onPress={logout} style={styles.gap} hint="Apaga usuário, senha e lista deste aparelho" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  muted: { color: colors.textMuted, fontSize: font.body, marginBottom: spacing.sm },
  label: { color: colors.text, fontSize: font.body },
  error: { color: colors.error, fontSize: font.body, marginBottom: spacing.sm },
  gap: { marginVertical: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: 10, padding: spacing.md, gap: spacing.xs },
  switchRow: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  switchTexts: { flex: 1 },
});
