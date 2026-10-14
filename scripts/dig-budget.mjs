// Dig performance budget (docs/release-checklist.md, D3 and B5).
// usage: node scripts/dig-budget.mjs [--secs 30] [--rafeeqs 8]
// Starts its own static server on 127.0.0.1 (a free port, never 8101) and ONE headless Chrome, measures, then ends
// both by PID. Prints one summary line. Exits 1 if a measured number is over budget; a number it could not measure
// prints "not measured" (never "pass") and does not by itself fail the run.
// Budget: first frame < 2000 ms (cold cache), p95 frame < 20 ms over 30 s with 8 Rafeeqs on the deepest land, save < 1 MiB.
// Caveat: the browser is headless with software drawing (--disable-gpu), so frame times are a worst case, not the owner's screen.
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { basename, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

export const BUDGET = { firstFrameMs: 2000, p95Ms: 20, saveBytes: 1024 * 1024 };
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? Number(process.argv[i + 1]) : d; };
// one summary line from the three numbers (null = not measured)
export function summary(m, secs = 30, crew = 8) {
  const f = (v, unit, over) => (v == null ? 'not measured' : `${v}${unit}${over ? ' OVER' : ''}`);
  const over = {
    ff: m.firstFrameMs != null && m.firstFrameMs >= BUDGET.firstFrameMs,
    p95: m.p95Ms != null && m.p95Ms >= BUDGET.p95Ms,
    save: m.saveBytes != null && m.saveBytes >= BUDGET.saveBytes,
  };
  const line = `dig-budget: first frame ${f(m.firstFrameMs, ' ms', over.ff)} (<${BUDGET.firstFrameMs}) | p95 frame ${f(m.p95Ms, ' ms', over.p95)} over ${secs} s with ${crew} Rafeeqs (<${BUDGET.p95Ms}) | save ${f(m.saveBytes, ' bytes', over.save)} (<${BUDGET.saveBytes})`;
  return { line, failed: over.ff || over.p95 || over.save };
}

// runs in the page: put the game on the deepest land with the crew, then time the frames
const PAGE = `
const out = { p95Ms: null, saveBytes: null, note: '' };
try {
  const dig = window.dig, G = dig.G, s = dig.state;
  s.contractFree = true;
  const last = G.ROAD[G.ROAD.length - 1];
  G.newSite(s, last.site, () => {}, undefined, { floor: last.floor, twist: '', hard: '', ch: last.ch });
  const st = G.siteStamp(s);
  for (const f of G.ROAD) s.road.stamps[G.siteKey(f.site, f.floor, '', f.ch)] = { ...JSON.parse(JSON.stringify(st)), site: f.site, floor: f.floor, ch: f.ch, fin: 1 };
  while (s.diggers.length < CREW) s.diggers.push(G.newRafeeq(s));
  if (G.rafeeqSeats) G.rafeeqSeats(s);
  out.crew = s.diggers.length;
  dig.save();
  out.saveBytes = new TextEncoder().encode(G.serialize(s)).length;
} catch (e) { out.note = 'setup failed: ' + e.message; }
const dts = [];
await new Promise(res => { let last = performance.now(); const end = last + SECS * 1000; const tick = now => { dts.push(now - last); last = now; if (now < end) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
dts.shift();
dts.sort((a, b) => a - b);
out.frames = dts.length;
if (dts.length > 30 && !out.note) out.p95Ms = Math.round(dts[Math.min(dts.length - 1, Math.ceil(dts.length * 0.95) - 1)] * 10) / 10;
return out;
`;

async function main() {
  const secs = arg('secs', 30), crew = arg('rafeeqs', 8);
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
  const srv = createServer(async (rq, rs) => {
    try {
      const p = normalize(join(root, decodeURIComponent(rq.url.split('?')[0])));
      if (p !== root && !p.startsWith(root + sep)) { rs.writeHead(403).end(); return; }
      const body = await readFile(p);
      rs.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(body);
    } catch { rs.writeHead(404).end(); }
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const port = 9600 + Math.floor(Math.random() * 300);
  const prof = mkdtempSync(join(tmpdir(), 'digbudget-'));      // a fresh profile is a cold cache
  const m = { firstFrameMs: null, p95Ms: null, saveBytes: null };
  let ch = null;
  // end Chrome's whole tree: by the PID we started, then any left over that carry our own profile folder (as scripts/shot.mjs does)
  const stopChrome = () => {
    if (ch && ch.pid) { try { spawnSync('taskkill', ['/pid', String(ch.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* gone */ } try { ch.kill(); } catch { /* gone */ } }
    try { spawnSync('wmic', ['process', 'where', `name='chrome.exe' and CommandLine like '%${basename(prof)}%'`, 'call', 'terminate'], { stdio: 'ignore', timeout: 30000 }); } catch { /* none left */ }
  };
  process.on('exit', stopChrome);
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => process.exit(1));
  const guard = setTimeout(() => { console.error('budget run timed out'); process.exit(1); }, (secs + 120) * 1000);
  try {
    ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--window-size=1500,1000', 'about:blank'], { stdio: 'ignore' });
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    let tabs = null;
    for (let i = 0; i < 40 && !tabs; i++) { await sleep(250); try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { /* not up yet */ } }
    if (!tabs) throw new Error('browser did not start');
    const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise(r => ws.addEventListener('open', r));
    let id = 0; const pend = new Map();
    ws.addEventListener('message', ev => { const d = JSON.parse(ev.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d.error); pend.delete(d.id); } });
    const send = (method, params = {}) => new Promise(r => { pend.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
    await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Runtime.enable'); await send('Page.enable');
    await send('Page.navigate', { url: base + '/proto.html' });
    // first frame: ms since the load began, at the second animation frame after the game exists
    const ff = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `new Promise(res => { const go = () => { if (window.dig) requestAnimationFrame(() => requestAnimationFrame(() => res(Math.round(performance.now())))); else if (performance.now() > 20000) res(null); else setTimeout(go, 10); }; go(); })` });
    m.firstFrameMs = ff && typeof ff.result?.value === 'number' ? ff.result.value : null;
    const r = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => { const SECS = ${secs}, CREW = ${crew}; ${PAGE} })()` });
    const v = r && r.result && r.result.value;
    if (v) { m.p95Ms = v.p95Ms; m.saveBytes = v.saveBytes; if (v.note) console.error(v.note); }
    else console.error('measure failed', JSON.stringify(r).slice(0, 300));
    ws.close();
  } catch (e) { console.error('budget run failed:', e.message); }
  finally {
    stopChrome();
    srv.close(); if (srv.closeAllConnections) srv.closeAllConnections();
    await new Promise(r => setTimeout(r, 800));
    try { rmSync(prof, { recursive: true, force: true }); } catch { /* chrome still letting go */ }
  }
  clearTimeout(guard);
  const { line, failed } = summary(m, secs, crew);
  console.log(line);
  process.exit(failed ? 1 : 0);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
