// R22: design tokens and base components. Checks the rarity markup helpers and that the CSS
// layers stay wired together (aliases and components only reference tokens that exist).
// Run: node test_r22_ui.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RARITY_GLYPHS, rarityClass, rarityTag, gearCard } from './js/ui/rarity.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const tokensCss = read('./css/tokens.css');
const componentsCss = read('./css/components.css');
const styleCss = read('./css/style.css');

// Custom properties defined in a stylesheet's `:root` blocks
const definedIn = (css) => new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
const tokens = definedIn(tokensCss);

console.log('--- tokens.css carries the style guide §2.1 block ---');
{
  const guide = read('./docs/ui-style-guide.md');
  const block = guide.match(/```css\n([\s\S]*?)```/)[1];
  for (const name of definedIn(block)) assert.ok(tokens.has(name), `tokens.css is missing ${name}`);
  assert.match(tokensCss, /--rarity-legendary:\s*#ef8a3c/, 'Legendary is orange, not red');
  assert.match(tokensCss, /--font-ui:\s*'Inter'/, 'Inter is the UI font');
}

console.log('--- old variable names alias to tokens that exist ---');
{
  const root = styleCss.match(/:root\s*\{([\s\S]*?)\}/)[1];
  const aliases = [...root.matchAll(/(--[\w-]+)\s*:\s*var\((--[\w-]+)\)/g)];
  const required = ['--bg-primary', '--bg-secondary', '--bg-card', '--bg-card-hover', '--border-color',
    '--accent-cyan', '--accent-gold', '--accent-purple', '--accent-green', '--accent-rose', '--accent-red',
    '--text-main', '--text-muted', '--text-dim', '--font-sans'];
  const aliased = new Map(aliases.map(m => [m[1], m[2]]));
  for (const name of required) {
    assert.ok(aliased.has(name), `${name} should alias a token`);
    assert.ok(tokens.has(aliased.get(name)), `${name} -> ${aliased.get(name)} is not a token`);
  }
  // No raw hex values left in the alias block
  assert.doesNotMatch(root, /#[0-9a-f]{3,8}\b/i, 'style.css :root should only alias tokens');
}

console.log('--- components.css only uses defined tokens ---');
{
  const used = new Set([...componentsCss.matchAll(/var\((--[\w-]+)/g)].map(m => m[1]));
  assert.ok(used.size > 20);
  for (const name of used) assert.ok(tokens.has(name), `components.css uses undefined ${name}`);
  for (const cls of ['.btn', '.btn-primary', '.btn-dust', '.btn-buy', '.is-locked', '.card', '.card-row',
    '.is-affordable', '.chip', '.bar', '.segs', '.num', '.rarity', '.gear']) {
    const escaped = cls.replace(/[.]/g, '\\.');
    assert.match(componentsCss, new RegExp(`${escaped}(?![\\w-])`), `components.css should define ${cls}`);
  }
}

console.log('--- rarity: colour + glyph + word ---');
{
  assert.equal(rarityClass('Legendary'), 'legendary');
  assert.equal(rarityClass('COSMIC'), 'cosmic');
  assert.equal(rarityClass('Mythic'), '');
  assert.equal(rarityClass(undefined), '');
  for (const [cls, glyph] of Object.entries(RARITY_GLYPHS)) {
    const word = cls[0].toUpperCase() + cls.slice(1);
    const tag = rarityTag(word);
    assert.ok(tag.includes(`class="rarity ${cls}"`), `${word}: colour class`);
    assert.ok(tag.includes(`data-glyph="${glyph}"`), `${word}: glyph`);
    assert.ok(tag.includes(`>${word}<`), `${word}: word`);
    assert.ok(tokensCss.includes(`--rarity-${cls}:`), `${word}: token exists`);
  }
  assert.equal(rarityTag('Mythic'), '');
}

console.log('--- gear card ---');
{
  const html = gearCard('Weapon', { name: 'Legendary WEAPON', rarity: 'Legendary', attack: 5 }, '+5 Atk');
  assert.ok(html.includes('class="gear legendary"'));
  assert.ok(html.includes('◆◆◆◆') && html.includes('>Legendary<'));
  assert.ok(html.includes('>Weapon<') && html.includes('>+5 Atk<'));
  assert.ok(html.includes('class="stat num"'), 'stat line uses tabular figures');

  const empty = gearCard('Relic', null, '+0% Drain');
  assert.ok(empty.includes('>Empty<'));
  assert.ok(!empty.includes('class="rarity'), 'empty slot shows no rarity');

  const sneaky = gearCard('Armor', { name: '<img src=x onerror=1>', rarity: 'Rare' }, '+1 HP');
  assert.ok(!sneaky.includes('<img'), 'item names are escaped');
}

console.log('--- loot drop colours match the rarity tokens ---');
{
  const combat = read('./js/systems/CombatSystem.js');
  for (const [name, cls] of [['Common', 'common'], ['Rare', 'rare'], ['Epic', 'epic'], ['Legendary', 'legendary'], ['Cosmic', 'cosmic']]) {
    const drop = combat.match(new RegExp(`name: '${name}', color: '(#[0-9a-f]+)'`, 'i'));
    const token = tokensCss.match(new RegExp(`--rarity-${cls}:\\s*(#[0-9a-f]+)`, 'i'));
    assert.ok(drop && token, `${name}: drop and token colours found`);
    assert.equal(drop[1].toLowerCase(), token[1].toLowerCase(), `${name} drop colour matches its token`);
  }
}

console.log('All R22 UI tests passed.');
