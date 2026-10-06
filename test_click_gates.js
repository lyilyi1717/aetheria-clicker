// Delegated click handlers in main.js ignore a button unless it carries the `active` class.
// Each tab's update function must keep setting that class, or every click on the tab silently
// does nothing (talent buttons broke this way when R22 restyled them).
// Run: node test_click_gates.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('./js/main.js', import.meta.url), 'utf8');

// Body of a class method: from its signature to the next method at the same indent
const methodBody = (name) => {
  const start = main.indexOf(`\n  ${name}() {`);
  assert.ok(start >= 0, `main.js has no ${name}()`);
  const next = main.slice(start + 1).search(/\n  [a-zA-Z_$][\w$]*\([^)]*\)\s*\{/);
  return main.slice(start, next < 0 ? undefined : start + 1 + next);
};

console.log('--- buttons gated on `active` get it from their update function ---');
const gates = {
  '.btn-rank-talent': 'updateTalentsUI',
  '.btn-cast-spell': 'updateSpellsUI',
  '.btn-buy-qm-upgrade': 'updateQuartermasterUI',
  '.btn-brew': 'updateAlchemyUI',
};
for (const [selector, updater] of Object.entries(gates)) {
  const gate = new RegExp(`closest\\('${selector.replace('.', '\\.')}'\\);\\s*\\n\\s*if \\(\\w+ && \\w+\\.classList\\.contains\\('active'\\)\\)`);
  assert.match(main, gate, `${selector} click handler should still gate on .active`);
  assert.match(methodBody(updater), /classList\.toggle\('active',/, `${updater}() must toggle .active on ${selector}`);
}

console.log('All click-gate tests passed.');
