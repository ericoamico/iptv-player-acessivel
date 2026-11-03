import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gzip } from 'pako';

import { nowAndNext, parseXmltv } from '../src/api/epg';
import { bytesToText } from '../src/api/http';
import { parseM3U } from '../src/api/m3u';
import type { Channel } from '../src/types';
import { base64ToUtf8, normalizeName, utf8Decode } from '../src/utils/text';
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

test('parseXmltv liga por tvg-id e por nome, filtra janela', () => {
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
  const guide = parseXmltv(xml, channels, { now });
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
