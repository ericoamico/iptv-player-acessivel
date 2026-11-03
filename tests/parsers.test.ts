import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gzip } from 'pako';

import { nowAndNext, parseXmltv } from '../src/api/epg';
import { bytesToText, bytesToTextAsync } from '../src/api/http';
import { parseM3U } from '../src/api/m3u';
import type { Channel } from '../src/types';
import { base64ToUtf8, normalizeName, utf8Decode, utf8DecodeAsync, utf8SafeEnd } from '../src/utils/text';
import { parseXmltvDate } from '../src/utils/time';
import { normalizeServer, parseCredentialsFromLink } from '../src/utils/url';

test('normalizeServer', () => {
  assert.equal(normalizeServer('meuservidor.com:8080/'), 'http://meuservidor.com:8080');
  assert.equal(normalizeServer('https://x.tv:443/player_api.php?username=a'), 'https://x.tv:443');
});

test('parseCredentialsFromLink: get.php, player_api e /live/', () => {
  assert.deepEqual(parseCredentialsFromLink('http://srv.com:8080/get.php?username=joao&password=s%40nha&type=m3u_plus&output=ts'), {
    server: 'http://srv.com:8080',
    username: 'joao',
    password: 's@nha',
  });
  assert.deepEqual(parseCredentialsFromLink('http://srv.com/live/ana/123/456.ts'), {
    server: 'http://srv.com',
    username: 'ana',
    password: '123',
  });
  assert.equal(parseCredentialsFromLink('http://srv.com:8080'), null);
  assert.equal(parseCredentialsFromLink('srv.com'), null);
});

test('parseXmltvDate com fuso', () => {
  assert.equal(parseXmltvDate('20261103200000 -0300'), Date.UTC(2026, 10, 3, 23, 0, 0));
  assert.equal(parseXmltvDate('20261103200000 +0000'), Date.UTC(2026, 10, 3, 20, 0, 0));
  assert.equal(parseXmltvDate('202611032000'), Date.UTC(2026, 10, 3, 20, 0, 0));
});

test('parseM3U lê grupos, logos, tvg-id e url-tvg', () => {
  const m3u = `#EXTM3U url-tvg="http://epg.com/guia.xml.gz"
#EXTINF:-1 tvg-id="globo.br" tvg-name="Globo" tvg-logo="http://l/g.png" group-title="Abertos",Globo HD
http://s/1.ts
#EXTINF:-1 tvg-id="sbt.br" group-title="Abertos",SBT
http://s/2.ts
#EXTINF:-1,Sem Grupo
#EXTGRP:Esportes
http://s/3.m3u8
`;
  const p = parseM3U(m3u);
  assert.equal(p.epgUrl, 'http://epg.com/guia.xml.gz');
  assert.equal(p.categories.length, 2);
  assert.deepEqual(p.categories.map((c) => [c.name, c.channelCount]), [['Abertos', 2], ['Esportes', 1]]);
  assert.equal(p.channels[0].name, 'Globo HD');
  assert.equal(p.channels[0].epgChannelId, 'globo.br');
  assert.equal(p.channels[0].logo, 'http://l/g.png');
  assert.equal(p.channels[2].url, 'http://s/3.m3u8');
  assert.throws(() => parseM3U('<html>erro</html>'));
});

test('parseXmltv liga por tvg-id e por nome, filtra janela', async () => {
  const now = Date.UTC(2026, 10, 3, 20, 30);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<tv>
  <channel id="globo.br"><display-name>Globo</display-name></channel>
  <channel id="espn.us"><display-name lang="pt">ESPN Brasil</display-name></channel>
  <programme start="20261103200000 +0000" stop="20261103211500 +0000" channel="globo.br">
    <title lang="pt">Jornal &amp; Notícias</title><desc>Resumo do dia</desc>
  </programme>
  <programme start="20261103211500 +0000" stop="20261103230000 +0000" channel="globo.br">
    <title><![CDATA[Novela <A>]]></title>
  </programme>
  <programme start="20261020200000 +0000" stop="20261020210000 +0000" channel="globo.br"><title>Antigo</title></programme>
  <programme start="20261103200000 +0000" stop="20261103220000 +0000" channel="espn.us"><title>Futebol</title></programme>
  <programme start="20261103200000 +0000" stop="20261103220000 +0000" channel="outro"><title>X</title></programme>
</tv>`;
  const channels: Channel[] = [
    { id: '1', name: 'Globo HD', categoryId: 'a', epgChannelId: 'GLOBO.BR' },
    { id: '2', name: 'ESPN Brasil FHD', categoryId: 'b' },
    { id: '3', name: 'Sem guia', categoryId: 'b' },
  ];
  const guide = await parseXmltv(xml, channels, { now });
  assert.deepEqual(Object.keys(guide).sort(), ['1', '2']);
  assert.equal(guide['1'].length, 2);
  assert.equal(guide['1'][0].title, 'Jornal & Notícias');
  assert.equal(guide['1'][0].description, 'Resumo do dia');
  assert.equal(guide['1'][1].title, 'Novela <A>');
  assert.equal(guide['2'][0].title, 'Futebol');
  const nn = nowAndNext(guide['1'], now);
  assert.equal(nn.now?.title, 'Jornal & Notícias');
  assert.equal(nn.next?.title, 'Novela <A>');
});

test('bytesToText descompacta gzip e decodifica UTF-8', () => {
  const text = '<tv>Programação ação 🎬</tv>';
  assert.equal(bytesToText(gzip(new TextEncoder().encode(text))), text);
  assert.equal(bytesToText(new TextEncoder().encode(text)), text);
});

test('utf8Decode manual (sem TextDecoder)', () => {
  const TD = globalThis.TextDecoder;
  // @ts-expect-error simula ambiente sem TextDecoder
  delete globalThis.TextDecoder;
  try {
    assert.equal(utf8Decode(new TextEncoder().encode('Notícias 🎬 ç')), 'Notícias 🎬 ç');
  } finally {
    globalThis.TextDecoder = TD;
  }
});

test('base64ToUtf8 (EPG curto Xtream)', () => {
  assert.equal(base64ToUtf8(Buffer.from('Futebol: Brasil × Argentina').toString('base64')), 'Futebol: Brasil × Argentina');
});

test('normalizeName ignora acentos e sufixos de qualidade', () => {
  assert.equal(normalizeName('ESPN Brasil FHD'), normalizeName('Espn brasil'));
  assert.equal(normalizeName('Globo [Alt] HD'), 'globo');
});

test('utf8SafeEnd não corta caracteres no meio', () => {
  const b = new TextEncoder().encode('aé🎬'); // a(1) é(2) 🎬(4)
  assert.equal(utf8SafeEnd(b, 2), 1); // cortaria o é
  assert.equal(utf8SafeEnd(b, 3), 3);
  assert.equal(utf8SafeEnd(b, 5), 3); // cortaria o emoji
  assert.equal(utf8SafeEnd(b, 7), 7);
});

test('utf8DecodeAsync junta pedaços cortados no meio de caracteres', async () => {
  const text = 'Programação ação 🎬 '.repeat(200_000); // ~5 MB, várias fatias
  const bytes = new TextEncoder().encode(text);
  const parts = [bytes.subarray(0, 1001), bytes.subarray(1001, 3_000_003), bytes.subarray(3_000_003)];
  let pauses = 0;
  const out = await utf8DecodeAsync(parts, async () => void pauses++);
  assert.equal(out, text);
  assert.ok(pauses > 0, 'deveria liberar a interface entre fatias');
});

test('bytesToTextAsync descompacta gzip grande em partes e respeita o limite', async () => {
  const text = '<programme>Notícia</programme>\n'.repeat(300_000); // ~10 MB
  const gz = gzip(new TextEncoder().encode(text));
  assert.equal(await bytesToTextAsync(gz), text);
  await assert.rejects(bytesToTextAsync(gz, 1_000_000), /grande demais/);
});

test('parseXmltv libera a interface em arquivos grandes', async () => {
  const now = Date.UTC(2026, 10, 3, 20, 30);
  let xml = '<tv>';
  for (let i = 0; i < 5000; i++) {
    xml += `<programme start="20261103200000 +0000" stop="20261103210000 +0000" channel="c${i % 50}"><title>P${i}</title></programme>`;
  }
  xml += '</tv>';
  const channels: Channel[] = Array.from({ length: 50 }, (_, i) => ({ id: String(i), name: `C${i}`, categoryId: 'a', epgChannelId: `c${i}` }));
  let pauses = 0;
  const guide = await parseXmltv(xml, channels, { now, pause: async () => void pauses++ });
  assert.equal(Object.keys(guide).length, 50);
  assert.ok(pauses >= 10);
});
