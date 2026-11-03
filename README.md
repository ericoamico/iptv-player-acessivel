# IPTV Acessível

App de IPTV em React Native (Expo SDK 58) feito para funcionar bem com **TalkBack** (Android) e **VoiceOver** (iOS).

## Funcionalidades

- **Login** com servidor + usuário + senha (Xtream Codes) ou link M3U.
  - Colar um link completo (`get.php?username=…&password=…`) preenche servidor, usuário e senha.
  - Credenciais guardadas criptografadas (expo-secure-store).
- **Categorias**: cada categoria abre uma **tela nova** com os canais.
- **Canais**: busca por nome, logo, número e "Agora / A seguir" do EPG.
  - Toque duplo: assistir. Ação do leitor de tela (ou toque longo): ver programação.
- **Player** em **tela nova** (expo-video): HLS e MPEG-TS.
  - Botões grandes e acessíveis: anterior, reproduzir/pausar, próximo, tela cheia, programação.
  - Anuncia canal e programa ao começar a tocar.
  - Em paisagem, os controles não somem enquanto o leitor de tela estiver ativo.
  - Em caso de erro: "Tentar novamente" e "Tentar formato HLS/TS".
- **EPG**: XMLTV (`.xml` e `.xml.gz`), `url-tvg` do M3U, `xmltv.php` do Xtream e EPG curto (`get_short_epg`) como reserva.
- **Configurações**:
  - Modo de tela: **Retrato (padrão)**, Paisagem ou Automático.
  - Girar livremente no player.
  - Atualizar lista e guia agora, e atualização automática (12h/24h/desligada).
  - Endereço de EPG personalizado.
  - Formato do vídeo (TS/HLS).
  - Dados da conta (validade, telas) e sair.

## Endereço do servidor

Se o provedor passou apenas usuário e senha, peça a ele o **endereço do servidor (DNS)**, por exemplo `http://servidor.com:8080`.
Para deixar o endereço fixo no app, preencha `DEFAULT_SERVER` em `src/config.ts`.

## Rodando

```bash
npm install
npx expo run:android      # ou: npx eas-cli@latest build --profile development
```

O app usa módulos nativos (expo-video, secure-store, screen-orientation), então precisa de um *development build*. O Expo Go não serve.

## Scripts

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # testes de parsers (M3U, XMLTV, links) e da API Xtream com servidor simulado
```

## Estrutura

```
src/
├── app/                 # telas (Expo Router)
│   ├── login.tsx
│   ├── categories.tsx
│   ├── category/[id].tsx   # canais da categoria
│   ├── player/[id].tsx     # player
│   ├── epg/[id].tsx        # programação do canal
│   └── settings.tsx
├── api/                 # xtream.ts, m3u.ts, epg.ts, http.ts
├── store/               # zustand: auth, playlist, epg, settings
├── components/          # botões, campos e rádios acessíveis
├── hooks/               # orientação, leitor de tela, sincronização
└── utils/
```

## Observações

- `usesCleartextTraffic` (Android) e `NSAllowsArbitraryLoads` (iOS) estão ativados porque a maioria dos servidores IPTV usa `http://`.
- O iOS não toca MPEG-TS puro. Por isso o padrão no iPhone é HLS (`.m3u8`).
- O app não inclui nenhuma lista: o usuário fornece a dele.
