// Runs every test_*.js in the repo root, each in its own node process, and stops at the first
// failure. New test files are picked up automatically: no package.json edit needed.
// Usage: npm test            (all suites)
//        npm test -- tower   (only suites whose file name contains "tower")
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const filter = process.argv[2] || '';
const files = readdirSync(root)
  .filter(f => /^test_.*\.js$/.test(f) && f.includes(filter))
  .sort();

if (files.length === 0) {
  console.error(`No test files match "${filter}".`);
  process.exit(1);
}

for (const f of files) {
  console.log(`\n=== ${f} ===`);
  const r = spawnSync(process.execPath, [f], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\n${f} failed (exit ${r.status ?? r.signal}).`);
    process.exit(r.status || 1);
  }
}
console.log(`\nAll ${files.length} test files passed.`);
