// R25: reward toasts never cover the buff bar (css/rewards.css, js/buffBar.js)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

console.log('--- CSS: toast stack clears the buff bar ---');
{
  const rewards = read('./css/rewards.css');
  const tokens = read('./css/tokens.css');
  assert.match(tokens, /--buff-bar-h:\s*\d+px/, '--buff-bar-h token has a default');

  // 640px+: bar under the header, stack starts below it
  const wide = rewards.match(/@media \(min-width: 640px\) \{([\s\S]*?)\n\}/);
  assert.ok(wide, 'min-width 640px block (same breakpoint where the bar leaves the header)');
  assert.match(wide[1], /body\.has-buff-bar \.reward-toasts\s*\{[^}]*top:\s*calc\(var\(--header-h\) \+ var\(--buff-bar-h\) \+ 8px\)/,
    'stack offset by the measured bar height');

  // Under 640px: bar above the bottom nav, stack stops short of it
  const narrow = rewards.match(/@media \(max-width: 639px\) \{([\s\S]*?)\n\}/);
  assert.ok(narrow, 'max-width 639px block');
  assert.match(narrow[1], /body\.has-buff-bar \.reward-toasts\s*\{[^}]*max-height:[^;]*var\(--bottom-nav-h\)[^;]*var\(--buff-bar-h\)/,
    'stack height capped above bottom nav + bar');
  assert.match(narrow[1], /overflow:\s*hidden/, 'overflowing toasts are clipped, not drawn over the bar');

  // Without a bar the stack keeps its R23 place
  assert.equal((rewards.match(/top:\s*calc\(var\(--header-h\) \+ 8px\)/g) || []).length, 2, 'default top unchanged');

  // Same breakpoint as the buff bar's move to the bottom
  assert.match(read('./css/style.css'), /@media \(max-width: 639px\) \{\s*\.buff-bar \{/, 'buff bar moves at 639px');
}

console.log('--- JS: BuffBar publishes its height ---');
{
  const props = {};
  const listeners = [];
  const observed = [];
  const bar = { hidden: true, offsetHeight: 0, addEventListener() {} };
  const row = { hidden: true };
  globalThis.document = {
    getElementById: (id) => (id === 'buff-bar' ? bar : row),
    documentElement: { style: { setProperty: (k, v) => { props[k] = v; } } },
    body: { classList: { toggle() {} } }
  };
  globalThis.ResizeObserver = class { constructor(cb) { listeners.push(cb); } observe(el) { observed.push(el); } };

  const { BuffBar } = await import('./js/buffBar.js');
  const bb = new BuffBar({ gameState: { activeBuffs: [] } });
  bb.build();
  assert.deepEqual(observed, [bar], 'bar size is observed');

  bar.offsetHeight = 0;
  bb.publishHeight();
  assert.equal(props['--buff-bar-h'], undefined, 'a hidden bar (0px) keeps the last value');

  bar.offsetHeight = 52;
  listeners[0]();
  assert.equal(props['--buff-bar-h'], '52px', 'resize writes the measured height');

  delete globalThis.document;
  delete globalThis.ResizeObserver;
}

console.log('All R25 toast tests passed.');
