// usage: node scripts/shot.mjs <url> <jsfile> [chrome flags...] : loads url in headless Chrome, runs the async js, prints its result and any page errors
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const [url, jsfile, png, ...flags] = process.argv.slice(2);
const port = 9333 + Math.floor(Math.random() * 200);
const ch = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TEMP}/chprof${port}`, '--window-size=1500,1000', ...flags, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs;
for (let i = 0; i < 40; i++) { await sleep(250); try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch {} }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map(), errs = [];
ws.addEventListener('message', m => { const d = JSON.parse(m.data);
  if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d.error); pend.delete(d.id); }
  if (d.method === 'Runtime.exceptionThrown') errs.push('EXC ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 300));
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('ERR ' + d.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300));
  if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') errs.push('LOG ' + d.params.entry.text.slice(0, 200) + ' ' + (d.params.entry.url || ''));
});
const send = (method, params = {}) => new Promise(r => { pend.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable'); await send('Page.navigate', { url });
await sleep(Number(process.env.WAIT||2000));
for (let i = 0; i < 6; i++) { if (process.env.NOWAIT) break; const ok = await send('Runtime.evaluate', { expression: '!!window.dig', returnByValue: true }); if (ok?.result?.value) break; errs.length = 0; await send('Page.reload'); await sleep(Number(process.env.WAIT||2500)); }
const r = await send('Runtime.evaluate', { expression: `(async () => { ${readFileSync(jsfile, 'utf8')} })()`, awaitPromise: true, returnByValue: true });
if (png) { const clip = process.env.CLIP ? JSON.parse(process.env.CLIP) : undefined; const shot = await send('Page.captureScreenshot', { format: 'png', clip: clip && { ...clip, scale: +(process.env.SC||1) } }); (await import('node:fs')).writeFileSync(png, Buffer.from(shot.data, 'base64')); }
console.log(JSON.stringify(r?.result?.value ?? r, null, 0).slice(0, 1500));
console.log('page errors:', [...new Set(errs)].slice(0, 8).join(' || ') || 'none');
try { spawnSync('taskkill', ['/pid', String(ch.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {}
try { spawnSync('wmic', ['process', 'where', `name='chrome.exe' and CommandLine like '%remote-debugging-port=${port}%'`, 'call', 'terminate'], { stdio: 'ignore', timeout: 30000 }); } catch {} ch.kill(); setTimeout(() => process.exit(0), 400);
