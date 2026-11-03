import type { Category, Channel, Playlist } from '../types';
import { getText, AppError } from './http';

function attr(line: string, name: string): string | undefined {
  const m = new RegExp(`${name}="([^"]*)"`, 'i').exec(line);
  return m ? m[1].trim() || undefined : undefined;
}

/** Converte o texto de uma lista M3U/M3U8 (formato #EXTINF) em categorias e canais. */
export function parseM3U(text: string): Omit<Playlist, 'updatedAt'> {
  const lines = text.split(/\r?\n/);
  if (!lines.some((l) => l.startsWith('#EXTINF'))) {
    throw new AppError('O arquivo não parece ser uma lista M3U válida.', 'format');
  }
  const header = lines.find((l) => l.startsWith('#EXTM3U')) ?? '';
  const epgUrl = (attr(header, 'url-tvg') ?? attr(header, 'x-tvg-url'))?.split(',')[0]?.trim();

  const channels: Channel[] = [];
  const catIds = new Map<string, string>();
  const categories: Category[] = [];
  let pending: { info: string; group?: string } | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF')) {
      pending = { info: line };
    } else if (line.startsWith('#EXTGRP:') && pending) {
      pending.group = line.slice(8).trim();
    } else if (!line.startsWith('#') && pending) {
      const info = pending.info;
      const comma = info.lastIndexOf('",');
      const nameFromLine = (comma >= 0 ? info.slice(comma + 2) : info.slice(info.indexOf(',') + 1)).trim();
      const group = attr(info, 'group-title') ?? pending.group ?? 'Sem categoria';
      let catId = catIds.get(group);
      if (!catId) {
        catId = `g${catIds.size}`;
        catIds.set(group, catId);
        categories.push({ id: catId, name: group, channelCount: 0 });
      }
      const chno = attr(info, 'tvg-chno');
      channels.push({
        id: `c${channels.length}`,
        name: nameFromLine || attr(info, 'tvg-name') || `Canal ${channels.length + 1}`,
        logo: attr(info, 'tvg-logo'),
        epgChannelId: attr(info, 'tvg-id'),
        number: chno && !isNaN(Number(chno)) ? Number(chno) : undefined,
        categoryId: catId,
        url: line,
      });
      pending = null;
    }
  }

  const counts = new Map<string, number>();
  for (const c of channels) counts.set(c.categoryId, (counts.get(c.categoryId) ?? 0) + 1);
  for (const c of categories) c.channelCount = counts.get(c.id) ?? 0;

  return { categories, channels, epgUrl };
}

export async function m3uPlaylist(url: string): Promise<Playlist> {
  const text = await getText(url, 90_000);
  return { ...parseM3U(text), updatedAt: Date.now() };
}
