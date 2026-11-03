/**
 * Configuração fixa do app.
 *
 * Se o seu provedor informar o endereço do servidor (DNS), coloque-o em
 * DEFAULT_SERVER, por exemplo 'http://meuservidor.com:8080'. Assim o campo
 * "Servidor" já vem preenchido na tela de login e o usuário só digita
 * usuário e senha.
 */
export const DEFAULT_SERVER = '';

/** Tempo máximo (ms) para respostas da API e do download de listas. */
export const REQUEST_TIMEOUT_MS = 30_000;

/** Tempo máximo (ms) para baixar o EPG, que costuma ser grande. */
export const EPG_TIMEOUT_MS = 120_000;

/** Janela de programação mantida em cache: horas para trás e para frente. */
export const EPG_HOURS_BEFORE = 3;
export const EPG_HOURS_AFTER = 48;

/** Tamanho máximo do guia completo (descompactado). Acima disso o download é recusado. */
export const EPG_MAX_BYTES = 150 * 1024 * 1024;

/** Quantos pedidos de EPG curto (por canal) podem rodar ao mesmo tempo. */
export const SHORT_EPG_CONCURRENCY = 3;

/** Validade (ms) do EPG curto em memória. */
export const SHORT_EPG_TTL_MS = 20 * 60_000;
