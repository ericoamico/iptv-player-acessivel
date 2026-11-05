# Desenvolvimento

Expo SDK 58 (React Native 0.88, New Architecture, Hermes), Expo Router (native-stack), zustand e TypeScript.

## Rodando localmente

```bash
npm install
npx expo run:android      # ou: npx eas-cli@latest build --profile development
```

O app usa módulos nativos (expo-video, expo-secure-store, expo-screen-orientation, expo-intent-launcher),
então precisa de um *development build*. O Expo Go não serve.

```bash
npm run typecheck     # TypeScript
npm run lint          # ESLint
npm test              # parsers (M3U, XMLTV, links, UTF-8/gzip) e API Xtream com servidor simulado
npx expo start --web  # roda no navegador, só para testes: usa localStorage no lugar do SecureStore
```

Para deixar um servidor fixo na tela de login, preencha `DEFAULT_SERVER` em `src/config.ts`.
O repositório é público: não coloque usuário nem senha no código.

## Estrutura

```
src/
├── app/                    # telas (Expo Router)
│   ├── login.tsx
│   ├── categories.tsx
│   ├── category/[id].tsx   # canais da categoria (e favoritos, id "__favoritos__")
│   ├── player/[id].tsx     # player
│   ├── epg/[id].tsx        # programação do canal
│   └── settings.tsx
├── api/                    # xtream.ts, m3u.ts, epg.ts, http.ts
├── store/                  # zustand: auth, playlist, epg, favorites, settings, update
├── update/updater.ts       # atualização automática pelo GitHub Releases
├── components/             # botões, campos e rádios acessíveis
├── hooks/                  # orientação, leitor de tela, sincronização, canais/favoritos
└── utils/
```

## Dados

- **Credenciais**: `expo-secure-store` (Keystore no Android). Na web, `localStorage`.
- **Lista e guia completo**: JSON em arquivo (`expo-file-system`, `Paths.document`), porque podem
  passar do limite do AsyncStorage.
- **Configurações e favoritos**: AsyncStorage via `zustand/middleware` `persist`
  (chaves `settings` e `favorites`).
  - Favoritos: `Record<accountKey, favKey[]>`. `accountKey` = `x|servidor|usuário` ou `m|linkM3U`;
    `favKey` = `s<stream_id>` (Xtream) ou `u<url>` (M3U), que sobrevivem à atualização da lista.

## Guia de programação (EPG)

- Xtream: o "agora / a seguir" vem do `get_short_epg`, pedido só para os canais visíveis
  (`onViewableItemsChanged`), com fila de 3 pedidos simultâneos e cache de 20 min em memória.
- Guia completo XMLTV (`.xml`/`.xml.gz`): `xmltv.php` do Xtream, `url-tvg` do M3U ou URL própria.
  O download automático fica desligado por padrão no Xtream. Descompactação (pako `Inflate`),
  decodificação UTF-8 e varredura por regex rodam em lotes, liberando o thread de JS entre eles.
  O limite é `EPG_MAX_BYTES`.

## Acessibilidade

- Ações extras usam `accessibilityActions` com nomes próprios (`watch`, `epg`, `fav`, `up`, `down`,
  `next`, `prev`…). No Android, o React Native as expõe como `AccessibilityAction` personalizadas,
  que o TalkBack lista no controle de leitura "Ações" e no menu de ações.
- Anúncios via `AccessibilityInfo.announceForAccessibility` (`src/utils/a11y.ts`).

## Build e publicação do APK

Workflow em `.github/workflows/android-apk.yml`, disparado a cada push no `main` (ou manualmente):

1. `npm ci`, typecheck e testes.
2. `app.json`: `version` = `1.0.<run_number>` e `android.versionCode` = `run_number`.
3. `expo prebuild --platform android` e `gradlew assembleRelease`
   (`-PreactNativeArchitectures=arm64-v8a,armeabi-v7a`).
4. Assinatura com a chave de produção (veja abaixo).
5. Publica `iptv-acessivel.apk` e `latest.json` na release `apk-latest`, que é recriada a cada build.

### Assinatura

A chave fica nos segredos do repositório (Settings → Secrets and variables → Actions):

| Segredo | Conteúdo |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | keystore PKCS12 em base64 |
| `ANDROID_KEYSTORE_PASSWORD` | senha do keystore |
| `ANDROID_KEY_ALIAS` | `iptv-acessivel` |
| `ANDROID_KEY_PASSWORD` | senha da chave |

O workflow recria o keystore no runner, adiciona um `signingConfigs.release` ao
`android/app/build.gradle` gerado pelo prebuild e apaga o arquivo depois. Sem os segredos, o APK
sai com a chave de teste pública do Expo e o workflow mostra um aviso.

**Nunca coloque o keystore no repositório.** Se a chave for perdida, nenhuma versão nova instala
por cima da dos usuários: todos teriam que desinstalar e instalar de novo.

SHA-256 do certificado de produção:
`89:E6:4A:0E:D1:40:D1:F7:39:96:1A:0B:3F:04:DB:BF:46:A0:5E:41:90:FA:96:18:C7:E9:E6:79:C4:11:04:C1`

### Atualização automática

`latest.json`:

```json
{
  "versionCode": 8,
  "version": "1.0.8",
  "apkUrl": "https://github.com/ericoamico/iptv-player-acessivel/releases/download/apk-latest/iptv-acessivel.apk",
  "notes": "primeira linha da mensagem do commit",
  "publishedAt": "2026-11-04T20:57:35.216Z",
  "signerSha256": "…"
}
```

O app (`src/update/updater.ts`) busca o `latest.json` ao abrir e ao voltar ao primeiro plano, no
máximo a cada 6 h. Se `versionCode` for maior que o `nativeBuildVersion` instalado, oferece baixar
o APK (`File.createDownloadTask` para `Paths.cache`) e abre o instalador com
`ACTION_VIEW` + `contentUri` (`expo-intent-launcher`). Precisa da permissão
`REQUEST_INSTALL_PACKAGES`, declarada em `app.json`.

Hoje todo push no `main` vira atualização para todos os usuários. Ainda não existe separação entre
canal de teste e canal estável.

## Observações

- `usesCleartextTraffic` (Android) e `NSAllowsArbitraryLoads` (iOS) estão ativados porque a maioria
  dos servidores IPTV usa `http://`.
- O iOS não toca MPEG-TS puro, por isso o padrão no iPhone é HLS (`.m3u8`).
