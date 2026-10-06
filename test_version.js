// Version and changelog: VERSION matches the newest CHANGELOG entry and entries are well formed,
// so the About tab never shows a stale or broken changelog. Rules: AGENTS.md "Version and changelog".
// Run: node test_version.js
import assert from 'node:assert/strict';
import { VERSION, CHANGELOG } from './js/version.js';

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const parse = v => SEMVER.exec(v).slice(1).map(Number);
const cmp = (a, b) => {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
};

assert.match(VERSION, SEMVER, 'VERSION is MAJOR.MINOR.PATCH');
assert.ok(CHANGELOG.length > 0, 'CHANGELOG has entries');
assert.equal(CHANGELOG[0].version, VERSION, 'VERSION equals the top CHANGELOG entry');

for (const [i, e] of CHANGELOG.entries()) {
  const at = `CHANGELOG[${i}] (v${e.version})`;
  assert.match(e.version, SEMVER, `${at}: version is MAJOR.MINOR.PATCH`);
  assert.match(e.date, /^\d{4}-\d{2}-\d{2}$/, `${at}: date is YYYY-MM-DD`);
  assert.ok(typeof e.title === 'string' && e.title.trim(), `${at}: has a title`);
  assert.ok(Array.isArray(e.changes) && e.changes.length > 0, `${at}: lists at least one change`);
  for (const c of e.changes) assert.ok(typeof c === 'string' && c.trim(), `${at}: changes are non-empty strings`);
  if (i > 0) {
    const prev = CHANGELOG[i - 1];
    assert.ok(cmp(prev.version, e.version) > 0, `${at}: newer entries go on top (v${prev.version} must be > v${e.version})`);
    assert.ok(prev.date >= e.date, `${at}: dates don't go backwards`);
  }
}

console.log(`test_version: v${VERSION}, ${CHANGELOG.length} changelog entries OK`);
