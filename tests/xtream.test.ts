import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { after, before, test } from 'node:test';

import { xtreamLogin, xtreamPlaylist, xtreamShortEpg, xtreamStreamUrl } from '../src/api/xtream';
import type { Account } from '../src/types';

let server: Server;
let base = '';
const b64 = (s: string) => Buffer.from(s).toString('base64');

before(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url ?? '', 'http://x');
    const ok = url.searchParams.get('username') === 'joao' && url.searchParams.get('password') === 'senha 1';
    const json = (body: unknown) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    };
    if (url.pathname !== '/player_api.php') return void res.writeHead(404).end();
    if (!ok) return json({ user_info: { auth: 0 } });
    switch (url.searchParams.get('action')) {
      case null:
        return json({ user_info: { auth: 1, status: 'Active', exp_date: '1893456000', max_connections: '2' } });
      case 'get_live_categories':
        return json([
          { category_id: '1', category_name: 'Abertos' },
          { category_id: '2', category_name: 'Vazia' },
        ]);
      case 'get_live_streams':
        return json([
          { num: 1, name: 'Globo', stream_id: 10, category_id: '1', epg_channel_id: 'globo.br', stream_icon: '' },
          { num: 2, name: 'Avulso', stream_id: 11, category_id: null },
        ]);
      case 'get_short_epg':
        return json({
          epg_listings: [{ title: b64('Jornal'), description: b64('Notícias'), start_timestamp: '1800000000', stop_timestamp: '1800003600' }],
        });
    }
    json([]);
  });
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
after(() => server.close());

const account = (): Account => ({ type: 'xtream', server: base, username: 'joao', password: 'senha 1' });

test('login válido e inválido', async () => {
  const info = await xtreamLogin(account());
  assert.equal(info.status, 'Active');
  assert.equal(info.expiresAt, 1893456000 * 1000);
  await assert.rejects(xtreamLogin({ ...account(), password: 'errada' }), /incorretos/);
});

test('playlist agrupa canais e cria "Sem categoria"', async () => {
  const p = await xtreamPlaylist(account());
  assert.deepEqual(p.categories.map((c) => [c.name, c.channelCount]), [['Abertos', 1], ['Sem categoria', 1]]);
  assert.equal(p.channels[0].epgChannelId, 'globo.br');
  assert.equal(xtreamStreamUrl(account(), 10, 'ts'), `${base}/live/joao/senha%201/10.ts`);
});

test('EPG curto decodifica base64', async () => {
  const list = await xtreamShortEpg(account(), 10);
  assert.equal(list[0].title, 'Jornal');
  assert.equal(list[0].description, 'Notícias');
  assert.equal(list[0].start, 1800000000 * 1000);
});

test('servidor inexistente dá erro de conexão amigável', async () => {
  await assert.rejects(xtreamLogin({ ...account(), server: 'http://127.0.0.1:1' }), /Não foi possível conectar/);
});
