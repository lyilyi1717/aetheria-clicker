// R11 reward feedback: toast queue, ceremony scheduler and batching (pure logic, no DOM).
// Run: node test_rewards.js
import assert from 'node:assert/strict';
import { BigNum } from './js/engine/BigNum.js';
import {
  ToastQueue, CeremonyScheduler, RewardBatch, REWARD_CONFIG,
  mergeAmount, rewardTitle, rewardValue, normalizeTier
} from './js/ui/rewardQueue.js';
import { rewards } from './js/ui/rewards.js';

const C = REWARD_CONFIG;

console.log('--- helpers ---');
{
  assert.equal(mergeAmount(null, 3), 3);
  assert.equal(mergeAmount(2, null), 2);
  assert.equal(mergeAmount(2, 3), 5);
  const big = mergeAmount(new BigNum(1, 30), new BigNum(2, 30));
  assert.ok(big instanceof BigNum);
  assert.ok(Math.abs(big.toNumber() / 3e30 - 1) < 1e-9);
  assert.equal(normalizeTier('epic'), 'epic');
  assert.equal(normalizeTier('nonsense'), 'medium');
  assert.equal(rewardTitle({ title: 'Contract', count: 1 }), 'Contract');
  assert.equal(rewardTitle({ title: 'Contract', count: 4 }), 'Contract ×4');
  assert.equal(rewardTitle({ title: 'X', batchTitle: '{n} contracts complete', count: 4 }), '4 contracts complete');
  assert.equal(rewardValue({ amount: null }), '');
  assert.equal(rewardValue({ amount: 5, unit: 'gold' }), '+5 gold');
  assert.equal(rewardValue({ amount: 5, fmt: (n) => `${n * 2}` }), '+10');
}

console.log('--- toasts: same kind coalesces, count and amount sum ---');
{
  const q = new ToastQueue();
  const a = q.push({ tier: 'medium', kind: 'caravan', title: 'Caravan returned', amount: 100 }, 0);
  assert.equal(a.action, 'shown');
  const b = q.push({ tier: 'medium', kind: 'caravan', title: 'Caravan returned', amount: 50 }, 500);
  assert.equal(b.action, 'merged');
  assert.equal(b.entry, a.entry);
  assert.equal(q.visible.length, 1);
  assert.equal(a.entry.count, 2);
  assert.equal(a.entry.amount, 150);
  // merging pushes the expiry out, but never past the max lifetime
  assert.equal(a.entry.expiresAt, 500 + C.toastMs.medium);
  for (let t = 1000; t < C.toastMaxLifeMs; t += 1000) q.push({ tier: 'medium', kind: 'caravan', amount: 1 }, t);
  assert.equal(a.entry.expiresAt, C.toastMaxLifeMs, 'a toast fed forever still leaves');
  assert.equal(a.entry.count, 2 + (C.toastMaxLifeMs / 1000 - 1));
  // once expired, the next event starts a fresh toast
  q.tick(C.toastMaxLifeMs + 1);
  assert.equal(q.visible.length, 0);
  const c = q.push({ tier: 'medium', kind: 'caravan', amount: 7 }, C.toastMaxLifeMs + 2);
  assert.equal(c.action, 'shown');
  assert.notEqual(c.entry, a.entry);
}

console.log('--- toasts: different kinds stack, max 3, the rest wait ---');
{
  const q = new ToastQueue();
  for (let i = 0; i < 3; i++) assert.equal(q.push({ kind: `k${i}`, title: `T${i}` }, 0).action, 'shown');
  assert.equal(q.push({ kind: 'k3', title: 'T3' }, 0).action, 'queued');
  assert.equal(q.visible.length, 3);
  assert.equal(q.pending.length, 1);
  // a waiting toast still absorbs its kind
  assert.equal(q.push({ kind: 'k3' }, 10).action, 'merged');
  assert.equal(q.pending[0].count, 2);
  // nothing moves until a slot frees
  assert.deepEqual(q.tick(100), { removed: [], promoted: [] });
  const { removed, promoted } = q.tick(C.toastMs.medium + 1);
  assert.equal(removed.length, 3);
  assert.equal(promoted.length, 1);
  assert.equal(q.visible[0].kind, 'k3');
  assert.equal(q.visible[0].expiresAt, C.toastMs.medium + 1 + C.toastMs.medium, 'lifetime starts when shown');
}

console.log('--- toasts: overflow folds into one "+N more" entry ---');
{
  const q = new ToastQueue();
  for (let i = 0; i < 3 + C.maxPending; i++) q.push({ kind: `k${i}` }, 0);
  assert.equal(q.pending.length, C.maxPending);
  for (let i = 0; i < 20; i++) q.push({ kind: `extra${i}` }, 0);
  assert.equal(q.pending.length, C.maxPending, 'the waiting line never grows past maxPending');
  const more = q.pending[q.pending.length - 1];
  assert.equal(more.kind, '__more');
  assert.equal(more.count, 21, 'the folded entry plus 20 extras');
  assert.equal(rewardTitle(more), '+21 more rewards');
}

console.log('--- toasts: events without a kind never merge ---');
{
  const q = new ToastQueue();
  q.push({ title: 'a' }, 0);
  q.push({ title: 'a' }, 0);
  assert.equal(q.visible.length, 2);
}

console.log('--- ceremonies: one big per 60 s, the rest become toasts ---');
{
  const s = new CeremonyScheduler();
  const first = s.request({ tier: 'big', kind: 'stratum', title: 'Granite' }, 0);
  assert.equal(first.action, 'show');
  assert.equal(s.active, first.entry);
  // same kind while showing: merged into the open ceremony
  const again = s.request({ tier: 'big', kind: 'stratum', title: 'Obsidian' }, 100);
  assert.equal(again.action, 'merged');
  assert.equal(s.active.count, 2);
  assert.equal(s.active.title, 'Obsidian');
  assert.equal(s.finish(2000), null);
  // another big inside the cooldown: toast
  assert.equal(s.request({ tier: 'big', kind: 'relic' }, 30000).action, 'toast');
  // after the cooldown: ceremony again
  assert.equal(s.request({ tier: 'big', kind: 'relic' }, C.bigCeremonyCooldownMs + 1).action, 'show');
}

console.log('--- ceremonies: epic always shows, queues behind an open one, merges by kind ---');
{
  const s = new CeremonyScheduler();
  s.request({ tier: 'big', kind: 'ascension' }, 0);
  const e1 = s.request({ tier: 'epic', kind: 'transcend', amount: 2 }, 10);
  assert.equal(e1.action, 'queued');
  const e2 = s.request({ tier: 'epic', kind: 'transcend', amount: 2 }, 20);
  assert.equal(e2.action, 'merged');
  assert.equal(e1.entry.count, 2);
  assert.equal(e1.entry.amount, 4);
  // an epic inside the big cooldown is not dropped
  const w = s.request({ tier: 'epic', kind: 'warden' }, 30);
  assert.equal(w.action, 'queued');
  const next = s.finish(1000);
  assert.equal(next.kind, 'transcend');
  assert.equal(s.active, next);
  assert.equal(s.finish(2000).kind, 'warden');
  assert.equal(s.finish(3000), null);
  assert.equal(s.active, null);
}

console.log('--- ceremonies: at most one big waits behind an open ceremony ---');
{
  const s = new CeremonyScheduler();
  s.request({ tier: 'epic', kind: 'transcend' }, 0);
  assert.equal(s.request({ tier: 'big', kind: 'a' }, 1).action, 'queued');
  assert.equal(s.request({ tier: 'big', kind: 'b' }, 2).action, 'toast');
  // a queued big that later shows starts the cooldown then, not when it was queued
  const shown = s.finish(5000);
  assert.equal(shown.kind, 'a');
  assert.equal(s.lastBigAt, 5000);
}

console.log('--- ceremonies: duration and reduced motion ---');
{
  const s = new CeremonyScheduler();
  assert.equal(s.duration({ tier: 'big' }), C.ceremonyMs.big);
  assert.equal(s.duration({ tier: 'epic' }, true), C.ceremonyReducedMs.epic);
  assert.ok(C.ceremonyReducedMs.epic < C.ceremonyMs.epic);
}

console.log('--- batch: "12 Ascensions while you were away" ---');
{
  const b = new RewardBatch();
  assert.equal(b.active, false);
  b.begin();
  for (let i = 0; i < 12; i++) {
    b.add({ tier: 'big', kind: 'ascension', title: 'Ascended', batchTitle: '{n} Ascensions', amount: new BigNum(2.5, 6) });
  }
  for (let i = 0; i < 3; i++) b.add({ tier: 'medium', kind: 'achievement', title: `Ach ${i}` });
  b.add({ tier: 'small', title: 'one-off' });
  b.add({ tier: 'small', title: 'one-off' });
  const out = b.end('While you were away');
  assert.equal(b.active, false);
  assert.equal(out.length, 4, 'one per kind; kindless events stay separate');
  assert.equal(out[0].kind, 'ascension', 'highest tier first');
  assert.equal(out[0].count, 12);
  assert.ok(Math.abs(out[0].amount.toNumber() / 3e7 - 1) < 1e-9);
  assert.equal(rewardTitle(out[0]), '12 Ascensions');
  assert.equal(out[0].detail, 'While you were away');
  assert.equal(out[1].count, 3);
  assert.equal(out[1].title, 'Ach 2', 'latest name wins');
  // the batch is empty afterwards
  b.begin();
  assert.deepEqual(b.end(), []);
}

console.log('--- batch: nesting only flushes at the outermost end ---');
{
  const b = new RewardBatch();
  b.begin();
  b.begin();
  b.add({ kind: 'x' });
  assert.deepEqual(b.end(), []);
  assert.equal(b.active, true);
  assert.equal(b.end().length, 1);
  assert.deepEqual(b.end(), [], 'an extra end is harmless');
}

console.log('--- a batched summary through the scheduler is one ceremony ---');
{
  const b = new RewardBatch();
  b.begin();
  for (let i = 0; i < 150; i++) b.add({ tier: 'big', kind: 'ascension', amount: 1 });
  const [summary] = b.end('While you were away');
  const s = new CeremonyScheduler();
  const r = s.request(summary, 0);
  assert.equal(r.action, 'show');
  assert.equal(r.entry.count, 150);
  assert.equal(r.entry.amount, 150);
}

console.log('--- rewards API is a safe no-op without a DOM (systems call it in node tests) ---');
{
  assert.equal(typeof document, 'undefined');
  rewards.notify({ tier: 'epic', kind: 'x', title: 'x' });
  rewards.toast({ tier: 'medium', title: 'x' });
  rewards.ceremony({ tier: 'big', title: 'x' });
  rewards.beginBatch();
  rewards.endBatch('x');
  assert.equal(rewards.isCeremonyActive(), false);
}

console.log('\nAll reward feedback tests passed.');
