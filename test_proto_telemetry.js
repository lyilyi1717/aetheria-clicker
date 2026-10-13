// Anonymous play data: the row builders, the pace counter, the queue, the consent switch and the origin gate.
// No network: fetch and storage are fakes. Run: node test_proto_telemetry.js
import assert from 'node:assert/strict';
import * as G from './proto/game.js';
import { createTelemetry, telemetryGate, TEL_KEYS } from './proto/features/telemetry/queue.js';

const fresh = (seed = 1) => { G.seedRng(seed); return G.newState(); };
const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };
const mk = (o = {}) => {
  const calls = [], store = o.store || mem();
  const env = { store, ver: '1.2.3', url: 'https://x.test', key: 'k', now: () => o.now || 1e12, rand: Math.random, allowed: o.allowed !== false,
    fetch: async (url, init) => { calls.push({ url, init }); if (o.fail) throw new Error('offline'); return { ok: !o.status, status: o.status || 201 }; } };
  return { tel: createTelemetry(env), calls, store };
};

// ---- the row of a try that ends ----
{
  const s = fresh(); G.siteRun(s); s.run.clock = 123.456; s.best = 61; s.total = 5000; s.stars = 3; s.bossesDown = 1;
  const r = G.telemetryTryRow(s, 'left');
  assert.equal(r.site, 'dunes'); assert.equal(r.floor, 50); assert.equal(r.level, 1); assert.equal(r.outcome, 'left');
  assert.equal(r.att_s, 123.5); assert.equal(r.depth, 61); assert.equal(r.coins, 5000); assert.equal(r.rocks, 1); assert.equal(r.try_n, 1);
  assert.ok(r.pick >= 1 && r.rafeeqs >= 0 && r.drill === 0);
  assert.ok(r.gate_left === null || (r.gate_left >= 0 && r.gate_left <= 1));
  assert.equal(G.telemetryTryRow(s, 'finished').gate_left, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(r)), r, 'a row is plain data');
  for (const k of ['name', 'email', 'ip']) assert.ok(!(k in r));
  s.run.floor = 77; s.run.twist = 'dim'; assert.equal(G.telemetryTryRow(s, 'left').level, 0, 'off the road is level 0');
}
// the price of a purchase is what was paid, and the state is left as it was
{
  const s = fresh(); s.coins = 1e9; const before = s.coins; assert.ok(G.buy(s, 'pick'));
  const lv = G.itemLevel(s, 'pick'), price = G.telemetryBuyPrice(s, 'pick', lv, G.upgradeCost);
  assert.ok(price > 0 && Math.abs((before - s.coins) - price) < 1e-6, 'price matches what left the purse');
  assert.equal(G.itemLevel(s, 'pick'), lv);
}
// the pace counter: one sample per sampleSecs of attended time, nothing in the save
{
  const s = fresh(); const got = [];
  const ev = (k, d) => { if (k === 'telemetryPace') got.push(d); };
  G.siteRun(s);
  for (let i = 0; i < 20 * 130; i++) G.step(s, 0.05, ev);
  assert.ok(got.length >= 1 && got.length <= 3, 'about two samples in 130 s, got ' + got.length);
  assert.ok(got[0].n === 1 && got[0].coins_s >= 0 && got[0].blocks_s >= 0 && got[0].dt >= 60);
  assert.equal(JSON.parse(G.serialize(s)).tel.n, 0, 'the counter is saved as its default');
}
// an old save (no telemetry slice) loads
{
  const s = fresh(); const o = JSON.parse(G.serialize(s)); delete o.tel;
  assert.ok(G.deserialize(JSON.stringify(o)));
}

// ---- the origin gate ----
const gate = (hostname, search = '', extra = {}) => telemetryGate({ hostname, protocol: 'https:', search, ...extra });
assert.equal(gate('lyilyi1717.github.io'), true);
assert.equal(gate('localhost'), false); assert.equal(gate('127.0.0.1'), false); assert.equal(gate('192.168.1.5'), false);
assert.equal(gate('lyilyi1717.github.io', '?speed=4'), false); assert.equal(gate('lyilyi1717.github.io', '?test=1'), false);
assert.equal(gate('lyilyi1717.github.io', '?sim=1'), false); assert.equal(gate('lyilyi1717.github.io', '', { webdriver: true }), false);
assert.equal(gate('127.0.0.1', '?telemetry=1'), true, 'the override');
assert.equal(telemetryGate({ hostname: 'a.b', protocol: 'file:' }), false);

// ---- the queue ----
(async () => {
  {
    const { tel, calls, store } = mk();
    assert.equal(tel.add('tries', { site: 'dunes', level: 1 }), true);
    tel.add('choices', { kind: 'buy', item: 'crew' }); tel.add('nope', {});
    assert.equal(tel.size(), 2);
    const pid = tel.pid(); assert.match(pid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(tel.pid(), pid, 'the id is kept');
    assert.ok(store.getItem(TEL_KEYS.queue), 'queued in storage');
    const sent = await tel.flush(true);
    assert.equal(sent, 2); assert.equal(calls.length, 2, 'one request per table');
    assert.ok(calls[0].url.endsWith('/rest/v1/dig_tries') && calls[0].init.keepalive === true && calls[0].init.headers.apikey === 'k');
    const body = JSON.parse(calls[0].init.body); assert.equal(body[0].pid, pid); assert.equal(body[0].ver, '1.2.3'); assert.equal(body[0].days, 0);
    assert.equal(tel.size(), 0); assert.equal(store.getItem(TEL_KEYS.queue), null);
  }
  { // offline keeps rows and does not throw; a refusal drops them; the queue is capped
    const { tel } = mk({ fail: true });
    tel.add('tries', { a: 1 }); await tel.flush(); assert.equal(tel.size(), 1, 'kept offline');
    for (let i = 0; i < 300; i++) tel.add('pace', { n: i }); assert.ok(tel.queued('pace') <= 200);
    const r = mk({ status: 400 }); r.tel.add('tries', { a: 1 }); await r.tel.flush(); assert.equal(r.tel.size(), 0, 'a refused batch is dropped');
    const e = mk({ status: 503 }); e.tel.add('tries', { a: 1 }); await e.tel.flush(); assert.equal(e.tel.size(), 1, 'a server error is retried');
  }
  { // the queue survives a reload (same storage, new object)
    const a = mk(); a.tel.add('tries', { a: 1 });
    const b = mk({ store: a.store }); assert.equal(b.tel.size(), 1);
  }
  { // consent Off: nothing queued, nothing sent, the queue is dropped
    const { tel, calls, store } = mk();
    tel.add('tries', { a: 1 }); assert.equal(tel.size(), 1);
    tel.setConsent(false);
    assert.equal(tel.consent(), false); assert.equal(tel.size(), 0); assert.equal(store.getItem(TEL_KEYS.queue), null);
    assert.equal(tel.add('tries', { a: 1 }), false); assert.equal(await tel.flush(), 0); assert.equal(calls.length, 0);
    tel.setConsent(true); assert.equal(tel.add('tries', { a: 1 }), true);
  }
  { // a page that is not allowed (test, local) sends nothing even with consent
    const { tel, calls } = mk({ allowed: false });
    assert.equal(tel.add('tries', { a: 1 }), false); await tel.flush(); assert.equal(calls.length, 0);
  }
  { // days since the device started, and time away
    let now = 1e12; const store = mem();
    const tel = createTelemetry({ store, ver: '1', url: 'u', key: 'k', now: () => now, rand: Math.random, allowed: true, fetch: async () => ({ ok: true }) });
    assert.equal(tel.days(), 0); now += 2.5 * 86400000; assert.equal(tel.days(), 2.5);
    tel.markLast(); now += 90000; assert.equal(tel.awayBefore(), 90);
  }
  console.log('test_proto_telemetry: ok');
})().catch(e => { console.error(e); process.exit(1); });

// players reach Dig through ?loop=3 on the published site: that must send
{
  const { telemetryGate } = await import('./proto/features/telemetry/queue.js');
  if (!telemetryGate({ hostname: 'lyilyi1717.github.io', protocol: 'https:', search: '?loop=3' })) throw new Error('published ?loop=3 must send');
  console.log('ok published ?loop=3 sends');
}
