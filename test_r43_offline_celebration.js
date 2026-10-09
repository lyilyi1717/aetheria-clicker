// R43: welcome-back celebration (docs/game-feel-opportunities.md §3 item 3). Checks that opening
// the offline modal rings a bell and counts the total up over 1.2 s, that a tap snaps it to the
// end, that the rows reveal and sparks fire once, that Collect plucks, closes and pulses the
// header Oil value, and that reduced motion shows the total at once (sound kept).
// Run: node test_r43_offline_celebration.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  startCelebration, OFFLINE_COUNT_MS, OFFLINE_SPARKS, OFFLINE_ROW_STAGGER_MS
} from './js/ui/offlineModal.js';
import { BigNum } from './js/engine/BigNum.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

function fakeEl() {
  const classes = new Set();
  return {
    textContent: '',
    style: { props: {}, setProperty(k, v) { this.props[k] = v; } },
    classList: {
      add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c)
    }
  };
}

function setup({ reduced = false } = {}) {
  const rows = [fakeEl(), fakeEl(), fakeEl()];
  const table = Object.assign(fakeEl(), { querySelectorAll: () => rows });
  const els = { modal: fakeEl(), total: fakeEl(), table, button: fakeEl() };
  els.modal.classList.add('visible');
  const log = { fires: [], counts: [], pulses: [], cancelled: 0, timers: [] };
  const feedback = {
    fire: (tier, opts) => { log.fires.push({ tier, ...opts }); return {}; },
    countUp: (el, from, to, opts) => { log.counts.push({ el, from, to, ...opts }); return () => { log.cancelled++; }; }
  };
  const rewards = { pulse: (id) => log.pulses.push(id) };
  const timers = [];
  const deps = {
    feedback, rewards, reduced: () => reduced,
    setTimer: (fn, ms) => { timers.push({ fn, ms, cleared: false }); return timers.length - 1; },
    clearTimer: (id) => { timers[id].cleared = true; }
  };
  const amount = new BigNum(12345);
  const c = startCelebration(els, amount, deps);
  return { els, rows, log, timers, c, amount };
}

console.log('--- open: bell, count-up over 1.2 s, rows wait ---');
{
  assert.equal(OFFLINE_COUNT_MS, 1200);
  assert.equal(OFFLINE_SPARKS, 24);
  assert.equal(OFFLINE_ROW_STAGGER_MS, 120);
  const { els, rows, log, timers, c, amount } = setup();
  assert.equal(log.fires[0].sound, 'bell', 'opens with a bell');
  assert.equal(log.counts.length, 1);
  assert.equal(log.counts[0].el, els.total);
  assert.equal(log.counts[0].from, 0, 'counts up from 0');
  assert.equal(log.counts[0].ms, OFFLINE_COUNT_MS);
  assert.equal(timers[0].ms, OFFLINE_COUNT_MS);
  assert.ok(els.table.classList.contains('is-pending'), 'rows hidden during the count');
  assert.deepEqual(rows.map(r => r.style.props['--row']), ['0', '1', '2'], 'stagger index per row');
  assert.equal(c.done(), false);
  assert.equal(log.fires.filter(f => f.sparks).length, 0, 'no sparks before the count lands');

  timers[0].fn();
  assert.equal(c.done(), true);
  assert.ok(els.table.classList.contains('is-revealed'));
  assert.ok(!els.table.classList.contains('is-pending'));
  const sparks = log.fires.filter(f => f.sparks);
  assert.equal(sparks.length, 1, 'gold sparks once');
  assert.equal(sparks[0].sparks, OFFLINE_SPARKS);
  assert.equal(sparks[0].at, els.total);
  assert.equal(els.total.textContent, amount.format('standard', 2));
}

console.log('--- tapping skips: the count snaps to the end ---');
{
  const { els, log, timers, c, amount } = setup();
  els.modal.onclick({ target: els.modal });
  assert.equal(c.done(), true);
  assert.equal(log.cancelled, 1, 'running count-up cancelled');
  assert.equal(timers[0].cleared, true);
  assert.equal(els.total.textContent, amount.format('standard', 2), 'final total shown');
  els.modal.onclick({ target: els.modal });
  assert.equal(log.fires.filter(f => f.sparks).length, 1, 'a second tap does not spark again');
  assert.ok(els.modal.classList.contains('visible'), 'tapping does not close it');
}

console.log('--- Collect: pluck, close, header Oil pulses ---');
{
  const { els, log, c } = setup();
  let stopped = false;
  els.button.onclick({ stopPropagation: () => { stopped = true; } });
  assert.ok(stopped);
  assert.equal(c.done(), true, 'collect mid-count finishes it');
  assert.ok(log.fires.some(f => f.sound === 'pluck'), 'plucks');
  assert.ok(!els.modal.classList.contains('visible'), 'closes');
  assert.deepEqual(log.pulses, ['stat-aether']);
}

console.log('--- reduced motion: total at once, sound kept ---');
{
  const { els, log, timers, c, amount } = setup({ reduced: true });
  assert.equal(c.done(), true);
  assert.equal(log.counts.length, 0, 'no count-up');
  assert.equal(timers.length, 0);
  assert.equal(els.total.textContent, amount.format('standard', 2));
  assert.ok(els.table.classList.contains('is-revealed'));
  assert.equal(log.fires[0].sound, 'bell', 'bell still rings');
}

console.log('--- markup and wording ---');
{
  const html = read('./index.html');
  assert.match(html, /id="offline-modal-close"[^>]*data-i18n="offline\.collect">Collect</);
  const en = read('./js/i18n/en.js');
  assert.match(en, /"offline\.collect": "Collect"/);
  assert.doesNotMatch(en, /"offline\.[^"]+": "[^"]*\blost\b/i, 'offline wording never says "lost"');
}

console.log('All R43 offline celebration tests passed.');
