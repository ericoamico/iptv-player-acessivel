import { EPG_HOURS_AFTER, EPG_HOURS_BEFORE, EPG_TIMEOUT_MS } from '../config';
import type { Channel, EpgGuide, Programme } from '../types';
import { decodeEntities, normalizeName, yieldToUI } from '../utils/text';
import { parseXmltvDate } from '../utils/time';
import { getLargeText } from './http';

function attr(tag: string, name: string): string | undefined {
  const m = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`).exec(tag);
  return m ? decodeEntities(m[2] ?? m[3] ?? '') : undefined;
}

function firstText(body: string, tag: string): string | undefined {
  const m = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`).exec(body);
  if (!m) return undefined;
  let t = m[1];
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(t);
  t = cdata ? cdata[1] : decodeEntities(t.replace(/<[^>]+>/g, ''));
  return t.trim() || undefined;
}

export interface ParseXmltvOptions {
  now?: number;
  hoursBefore?: number;
  hoursAfter?: number;
  /** Função chamada periodicamente para liberar a interface. */
  pause?: () => Promise<void>;
}

/** A cada quantos itens o parser libera a interface. */
const BATCH = 400;

/**
 * Lê um XMLTV e devolve a programação ligada aos canais da lista.
 * A ligação é feita por tvg-id/epg_channel_id e, como reserva, pelo nome do canal.
 * Usa varredura por expressões regulares para gastar pouca memória em arquivos grandes,
 * e libera a interface a cada lote para o app não travar.
 */
export async function parseXmltv(xml: string, channels: Channel[], opts: ParseXmltvOptions = {}): Promise<EpgGuide> {
  const pause = opts.pause ?? yieldToUI;
  let count = 0;
  const now = opts.now ?? Date.now();
  const from = now - (opts.hoursBefore ?? EPG_HOURS_BEFORE) * 3_600_000;
  const to = now + (opts.hoursAfter ?? EPG_HOURS_AFTER) * 3_600_000;

  // Canais da lista por id de EPG e por nome normalizado.
  const byEpgId = new Map<string, Channel[]>();
  const byName = new Map<string, Channel[]>();
  const add = (map: Map<string, Channel[]>, key: string, c: Channel) => {
    if (!key) return;
    const list = map.get(key);
    if (list) list.push(c);
    else map.set(key, [c]);
  };
  for (const c of channels) {
    if (c.epgChannelId) add(byEpgId, c.epgChannelId.toLowerCase(), c);
    add(byName, normalizeName(c.name), c);
  }

  // <channel id="..."><display-name>...</display-name></channel> → canais da lista
  const xmlIdToChannels = new Map<string, Channel[]>();
  const channelRe = /<channel\b([^>]*)>([\s\S]*?)<\/channel>/g;
  let m: RegExpExecArray | null;
  while ((m = channelRe.exec(xml))) {
    if (++count % BATCH === 0) await pause();
    const id = attr(m[1], 'id');
    if (!id) continue;
    const key = id.toLowerCase();
    const matched = new Set<Channel>(byEpgId.get(key) ?? []);
    const nameRe = /<display-name\b[^>]*>([\s\S]*?)<\/display-name>/g;
    let n: RegExpExecArray | null;
    while ((n = nameRe.exec(m[2]))) {
      for (const c of byName.get(normalizeName(decodeEntities(n[1]))) ?? []) {
        if (!c.epgChannelId) matched.add(c);
      }
    }
    if (matched.size) xmlIdToChannels.set(key, [...matched]);
  }
  // Ids presentes só nos programas (sem bloco <channel>)
  for (const [key, list] of byEpgId) if (!xmlIdToChannels.has(key)) xmlIdToChannels.set(key, list);

  const guide: EpgGuide = {};
  const progRe = /<programme\b([^>]*)>([\s\S]*?)<\/programme>/g;
  while ((m = progRe.exec(xml))) {
    if (++count % BATCH === 0) await pause();
    const head = m[1];
    const chId = attr(head, 'channel')?.toLowerCase();
    if (!chId) continue;
    const targets = xmlIdToChannels.get(chId);
    if (!targets) continue;
    const start = parseXmltvDate(attr(head, 'start') ?? '');
    const stopRaw = attr(head, 'stop');
    const stop = stopRaw ? parseXmltvDate(stopRaw) : start + 3_600_000;
    if (!Number.isFinite(start) || stop < from || start > to) continue;
    const p: Programme = {
      start,
      stop: Number.isFinite(stop) ? stop : start + 3_600_000,
      title: firstText(m[2], 'title') ?? 'Sem título',
      description: firstText(m[2], 'desc'),
    };
    for (const c of targets) (guide[c.id] ??= []).push(p);
  }
  for (const id in guide) guide[id].sort((a, b) => a.start - b.start);
  return guide;
}

export async function downloadXmltv(url: string, channels: Channel[]): Promise<EpgGuide> {
  const xml = await getLargeText(url, EPG_TIMEOUT_MS);
  return parseXmltv(xml, channels);
}

export function nowAndNext(list: Programme[] | undefined, now = Date.now()) {
  if (!list?.length) return { now: undefined, next: undefined };
  const idx = list.findIndex((p) => p.start <= now && p.stop > now);
  if (idx >= 0) return { now: list[idx], next: list[idx + 1] };
  return { now: undefined, next: list.find((p) => p.start > now) };
}
