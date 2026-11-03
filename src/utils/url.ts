/** Garante protocolo e remove barras e caminhos de API do fim do endereço. */
export function normalizeServer(input: string): string {
  let s = input.trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`;
  // Mantém apenas protocolo + host + porta + eventual subcaminho antes de arquivos conhecidos.
  s = s.replace(/[?#].*$/, '');
  s = s.replace(/\/(player_api\.php|get\.php|xmltv\.php|panel_api\.php|live\/.*|c\/?)$/i, '');
  return s.replace(/\/+$/, '');
}

function getParam(query: string, name: string): string | undefined {
  const m = new RegExp(`[?&]${name}=([^&#]*)`, 'i').exec(query);
  if (!m) return undefined;
  try {
    return decodeURIComponent(m[1].replace(/\+/g, ' '));
  } catch {
    return m[1];
  }
}

export interface LinkCredentials {
  server: string;
  username: string;
  password: string;
}

/**
 * Extrai servidor, usuário e senha de links comuns de IPTV:
 *  - http://host:porta/get.php?username=U&password=P&type=m3u_plus
 *  - http://host:porta/player_api.php?username=U&password=P
 *  - http://host:porta/live/U/P/123.ts
 */
export function parseCredentialsFromLink(link: string): LinkCredentials | null {
  const s = link.trim();
  const origin = /^(https?:\/\/[^/?#]+)/i.exec(s)?.[1];
  if (!origin) return null;
  const username = getParam(s, 'username');
  const password = getParam(s, 'password');
  if (username && password) return { server: normalizeServer(s), username, password };
  const live = /^(https?:\/\/[^?#]*?)\/live\/([^/?#]+)\/([^/?#]+)\/\d+(?:\.\w+)?$/i.exec(s);
  if (live) {
    return { server: normalizeServer(live[1]), username: decodeURIComponent(live[2]), password: decodeURIComponent(live[3]) };
  }
  return null;
}

export const enc = encodeURIComponent;
