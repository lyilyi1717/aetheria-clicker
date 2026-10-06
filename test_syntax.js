// Every shipped JS file must parse, and no file may carry leftover merge-conflict markers.
// Unit tests import the systems, but nothing imports js/main.js, so a broken merge there
// (it happened once) would otherwise reach players with CI green. Run: node test_syntax.js
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['js', 'css', 'sim', 'index.html'];
const files = [];
const walk = p => {
  if (statSync(p).isDirectory()) for (const f of readdirSync(p)) walk(join(p, f));
  else files.push(p);
};
roots.forEach(walk);

const failures = [];
for (const f of files) {
  if (/^(<{7}|>{7}) /m.test(readFileSync(f, 'utf8'))) failures.push(`${f}: merge-conflict marker`);
  if (/\.(m?js)$/.test(f)) {
    const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    if (r.status !== 0) failures.push(`${f}: ${r.stderr.split('\n').find(l => /Error/.test(l)) || 'syntax error'}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Syntax OK: ${files.filter(f => /\.m?js$/.test(f)).length} JS files parse, no conflict markers.`);
