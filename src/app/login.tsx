import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View, type TextInputInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppError } from '../api/http';
import { xtreamLogin } from '../api/xtream';
import { AppButton } from '../components/AppButton';
import { RadioGroup } from '../components/RadioGroup';
import { TextField } from '../components/TextField';
import { DEFAULT_SERVER } from '../config';
import { useAuth } from '../store/authStore';
import { shouldAutoDownloadFullEpg, useEpg } from '../store/epgStore';
import { usePlaylist } from '../store/playlistStore';
import { useSettings } from '../store/settingsStore';
import { colors, font, MIN_TOUCH, spacing } from '../theme';
import type { Account, AccountType } from '../types';
import { announce, plural } from '../utils/a11y';
import { normalizeServer, parseCredentialsFromLink } from '../utils/url';

export default function LoginScreen() {
  const [type, setType] = useState<AccountType>('xtream');
  const [server, setServer] = useState(DEFAULT_SERVER);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [m3uUrl, setM3uUrl] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const userRef = useRef<TextInputInstance>(null);
  const passRef = useRef<TextInputInstance>(null);

  /** Se colarem um link completo (get.php?username=...&password=...), preenche tudo. */
  function onServerChange(text: string) {
    const creds = parseCredentialsFromLink(text);
    if (creds) {
      setServer(creds.server);
      setUsername(creds.username);
      setPassword(creds.password);
      announce('Link reconhecido. Servidor, usuário e senha foram preenchidos.');
    } else {
      setServer(text);
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (type === 'xtream') {
      if (!server.trim()) errs.server = 'Informe o endereço do servidor.';
      if (!username.trim()) errs.username = 'Informe o usuário.';
      if (!password) errs.password = 'Informe a senha.';
    } else if (!/^https?:\/\//i.test(m3uUrl.trim())) {
      errs.m3u = 'Informe um link começando com http:// ou https://';
    }
    setFieldErrors(errs);
    const msgs = Object.values(errs);
    if (msgs.length) announce(`Corrija os campos: ${msgs.join(' ')}`);
    return msgs.length === 0;
  }

  async function onSubmit() {
    setError(null);
    if (!validate()) return;

    let account: Account;
    if (type === 'm3u') {
      // Link M3U do tipo get.php vira conta Xtream (com EPG e categorias da API).
      const creds = parseCredentialsFromLink(m3uUrl);
      account = creds
        ? { type: 'xtream', ...creds }
        : { type: 'm3u', server: '', username: '', password: '', m3uUrl: m3uUrl.trim() };
    } else {
      account = { type: 'xtream', server: normalizeServer(server), username: username.trim(), password };
    }

    setBusy(true);
    announce('Conectando ao servidor…');
    try {
      if (account.type === 'xtream') await xtreamLogin(account);
      usePlaylist.getState().reset();
      useEpg.getState().reset();
      const playlist = await usePlaylist.getState().refresh(account);
      await useAuth.getState().save(account);
      announce(
        `Conectado. ${plural(playlist.channels.length, 'canal', 'canais')} em ${plural(playlist.categories.length, 'categoria', 'categorias')}.`,
      );
      if (shouldAutoDownloadFullEpg(account, useSettings.getState().fullEpgAuto)) {
        useEpg.getState().refresh(account, playlist).catch(() => {});
      }
      router.replace('/categories');
    } catch (e) {
      const msg = e instanceof AppError ? e.message : 'Não foi possível entrar. Tente novamente.';
      setError(msg);
      announce(`Erro: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.title}>
            Acesse sua lista de canais
          </Text>

          <RadioGroup<AccountType>
            title="Tipo de acesso"
            value={type}
            onChange={(v) => {
              setType(v);
              setFieldErrors({});
            }}
            options={[
              { value: 'xtream', label: 'Servidor, usuário e senha', description: 'Mais comum. Inclui guia de programação.' },
              { value: 'm3u', label: 'Link da lista M3U', description: 'Endereço completo da lista.' },
            ]}
          />

          {type === 'xtream' ? (
            <>
              <TextField
                label="Servidor"
                hint="Endereço informado pelo seu provedor, por exemplo http://servidor.com:8080. Se recebeu um link completo, cole aqui."
                value={server}
                onChangeText={onServerChange}
                autoCapitalize="none"
                keyboardType="url"
                textContentType="URL"
                returnKeyType="next"
                onSubmitEditing={() => userRef.current?.focus()}
                error={fieldErrors.server}
                placeholder="http://servidor.com:8080"
              />
              <TextField
                ref={userRef}
                label="Usuário"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                textContentType="username"
                autoComplete="username"
                returnKeyType="next"
                onSubmitEditing={() => passRef.current?.focus()}
                error={fieldErrors.username}
              />
              <TextField
                ref={passRef}
                label="Senha"
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                secureTextEntry={!showPassword}
                textContentType="password"
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={onSubmit}
                error={fieldErrors.password}
              />
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel} importantForAccessibility="no" accessibilityElementsHidden>
                  Mostrar senha
                </Text>
                <Switch
                  value={showPassword}
                  onValueChange={setShowPassword}
                  accessibilityLabel="Mostrar senha"
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor={colors.text}
                />
              </View>
            </>
          ) : (
            <TextField
              label="Link da lista M3U"
              hint="Cole o endereço completo da lista, começando com http."
              value={m3uUrl}
              onChangeText={setM3uUrl}
              autoCapitalize="none"
              keyboardType="url"
              textContentType="URL"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              error={fieldErrors.m3u}
              placeholder="http://…/lista.m3u"
            />
          )}

          {error ? (
            <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">
              {error}
            </Text>
          ) : null}

          <AppButton label="Entrar" onPress={onSubmit} busy={busy} hint="Conecta ao servidor e baixa a lista de canais" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { color: colors.text, fontSize: font.title, fontWeight: '700', marginBottom: spacing.lg },
  switchRow: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  switchLabel: { color: colors.text, fontSize: font.body },
  error: { color: colors.error, fontSize: font.body, fontWeight: '600', marginBottom: spacing.md },
});
