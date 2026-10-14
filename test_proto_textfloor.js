// Dig: no text the player reads is smaller than 13 px (docs/art-and-sound.md section 5). Run: node test_proto_textfloor.js
// Scans every CSS font-size / font and every canvas `font = '...px'` under proto/. Numbers that fly and fade are exempt
// (they are built from a computed size, not a literal, and are listed in ALLOW). proto/soundboard.* is a dev tool.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FLOOR = 13;
// flying hit numbers and mood bursts: sizes are computed per frame (`${n}px`), so they never match a literal; listed so a
// reader knows they are exempt on purpose
const ALLOW = ['proto/features/chatter/manager.js', 'proto/features/moods/ui.js', 'proto/ui/render.js'];
const root = fileURLToPath(new URL('./proto', import.meta.url));
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.(css|js|html)$/.test(f) && !/soundboard/.test(f) && files.push(p); } })(root);

let failed = 0, scanned = 0;
const bad = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const rel = 'proto/' + f.slice(root.length + 1).split(String.fromCharCode(92)).join('/');
  const res = [/font-size\s*:\s*(\d+(?:\.\d+)?)px/g, /\bfont\s*:\s*(?:[a-z0-9 ]*?\s)?(\d+(?:\.\d+)?)px/g, /\bfont\s*=\s*['"`][^'"`]*?\b(\d+(?:\.\d+)?)px/g];
  for (const re of res) for (const m of src.matchAll(re)) {
    scanned++;
    if (+m[1] < FLOOR && !ALLOW.includes(rel)) bad.push(`${rel}: ${m[0].slice(0, 70)}`);
  }
}
if (scanned < 100) { failed++; console.error(`FAIL: only ${scanned} font sizes found; the scan is broken`); }
for (const b of bad) { failed++; console.error('FAIL: under 13 px: ' + b); }
// the allow-listed files must not hide a literal under the floor either, except the known floaters
for (const rel of ALLOW) {
  const src = readFileSync(new URL('./' + rel, import.meta.url), 'utf8');
  for (const m of src.matchAll(/font\s*=\s*['"][^'"]*?\b(\d+(?:\.\d+)?)px/g)) if (+m[1] < FLOOR) { failed++; console.error(`FAIL: ${rel} has a literal ${m[1]}px`); }
}
if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log(`text floor: ${scanned} font sizes under proto/, none under ${FLOOR} px`);
