export type AccountType = 'xtream' | 'm3u';

export interface Account {
  type: AccountType;
  /** Endereço do servidor Xtream (ex.: http://servidor.com:8080). */
  server: string;
  username: string;
  password: string;
  /** Link da lista M3U (apenas para o tipo 'm3u'). */
  m3uUrl?: string;
  /** URL de EPG (XMLTV) personalizada, opcional. */
  epgUrl?: string;
}

export interface AccountInfo {
  status?: string;
  expiresAt?: number | null;
  maxConnections?: number;
  activeConnections?: number;
}

export interface Category {
  id: string;
  name: string;
  channelCount: number;
}

export interface Channel {
  id: string;
  name: string;
  number?: number;
  logo?: string;
  categoryId: string;
  /** Identificador do canal no EPG (tvg-id / epg_channel_id). */
  epgChannelId?: string;
  /** ID do stream no Xtream (a URL é montada na hora de tocar). */
  streamId?: number;
  /** URL direta do stream (listas M3U). */
  url?: string;
}

export interface Playlist {
  categories: Category[];
  channels: Channel[];
  updatedAt: number;
  /** URL de EPG anunciada pela própria lista (url-tvg do M3U). */
  epgUrl?: string;
  accountInfo?: AccountInfo;
}

export interface Programme {
  /** Início em milissegundos (epoch). */
  start: number;
  /** Fim em milissegundos (epoch). */
  stop: number;
  title: string;
  description?: string;
}

/** Programação indexada pelo id interno do canal (Channel.id). */
export type EpgGuide = Record<string, Programme[]>;
