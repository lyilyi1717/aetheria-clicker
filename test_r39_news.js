// R39: news ticker (local part). Checks per-entry direction (Arabic moves the other way), the
// length and count limits, that old saves load with defaults, that entries survive a save round
// trip, and that player text never goes through innerHTML.
// Run: node test_r39_news.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GameState } from './js/systems/GameState.js';
import { CHANGELOG, VERSION } from './js/version.js';
import {
  NEWS_MAX_CHARS, NEWS_MAX_ENTRIES, entryDir, cleanEntryText, defaultNewsState, sanitizeNews,
  addNewsEntry, removeNewsEntry, builtInItems, buildQueue
} from './js/ui/newsTicker.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

console.log('--- direction follows each entry\'s own script ---');
{
  assert.equal(entryDir('Oil prices soar'), 'ltr');
  assert.equal(entryDir('أسعار النفط ترتفع'), 'rtl');
  assert.equal(entryDir('2026: عام النفط'), 'rtl', 'digits and punctuation are neutral');
  assert.equal(entryDir('🛢️ Refinery news'), 'ltr', 'emoji are neutral');
  assert.equal(entryDir('Breaking: النفط'), 'ltr', 'first letter decides');
  assert.equal(entryDir('ﷺ'), 'rtl', 'presentation forms count as Arabic');
  assert.equal(entryDir(''), 'ltr');
  assert.equal(entryDir(undefined), 'ltr');
  const q = buildQueue({ entries: [{ id: 'a', text: 'hello' }, { id: 'b', text: 'مرحبا' }] }, CHANGELOG);
  assert.equal(q.find(i => i.text === 'hello').dir, 'ltr');
  assert.equal(q.find(i => i.text === 'مرحبا').dir, 'rtl');
}

console.log('--- length limit and cleaning ---');
{
  assert.equal(cleanEntryText('  two   spaces\nand\ttabs  '), 'two spaces and tabs');
  assert.equal(cleanEntryText('a'.repeat(300)).length, NEWS_MAX_CHARS);
  // Counted in characters, not UTF-16 units: emoji and Arabic don't get cut in half
  const emoji = cleanEntryText('🛢'.repeat(200));
  assert.equal(Array.from(emoji).length, NEWS_MAX_CHARS);
  assert.ok(!/[\uD800-\uDBFF]$/.test(emoji), 'no dangling surrogate');
  assert.equal(cleanEntryText('\u0000\u001b'), '');
  assert.equal(cleanEntryText(null), '');
}

console.log('--- add / delete ---');
{
  const news = defaultNewsState();
  assert.equal(addNewsEntry(news, '   ').ok, false, 'empty is refused');
  const r = addNewsEntry(news, 'First headline', 1000);
  assert.equal(r.ok, true);
  assert.equal(news.entries.length, 1);
  assert.equal(addNewsEntry(news, ' First   headline ').ok, false, 'duplicates are refused');
  for (let i = 1; i < NEWS_MAX_ENTRIES; i++) assert.equal(addNewsEntry(news, `item ${i}`, 1000 + i).ok, true);
  assert.equal(addNewsEntry(news, 'one too many').ok, false, 'list is capped');
  assert.equal(new Set(news.entries.map(e => e.id)).size, NEWS_MAX_ENTRIES, 'ids are unique');
  assert.equal(removeNewsEntry(news, r.entry.id), true);
  assert.equal(removeNewsEntry(news, 'nope'), false);
  assert.equal(news.entries.length, NEWS_MAX_ENTRIES - 1);
}

console.log('--- sanitize: anything a save holds becomes a valid state ---');
{
  for (const bad of [undefined, null, 'x', 3, [], { entries: 'nope' }]) {
    assert.deepEqual(sanitizeNews(bad), { hidden: false, entries: [] });
  }
  const s = sanitizeNews({
    hidden: true,
    entries: ['plain string', { id: 'a', text: 'b'.repeat(500), at: 5 }, { id: 'a', text: 'same id' }, { text: '' }, null,
      ...Array.from({ length: 40 }, (_, i) => ({ id: `x${i}`, text: `t${i}` }))]
  });
  assert.equal(s.hidden, true);
  assert.equal(s.entries.length, NEWS_MAX_ENTRIES);
  assert.equal(s.entries[0].text, 'plain string');
  assert.equal(s.entries[1].text.length, NEWS_MAX_CHARS);
  assert.equal(new Set(s.entries.map(e => e.id)).size, s.entries.length, 'duplicate ids fixed');
  assert.equal(sanitizeNews({ hidden: 'yes' }).hidden, false, 'only true hides');
}

console.log('--- saves: old saves get defaults, entries persist ---');
{
  const fresh = new GameState();
  assert.deepEqual(fresh.settings.news, { hidden: false, entries: [] });

  const old = new GameState();
  const data = JSON.parse(JSON.stringify(old.serialize()));
  delete data.settings.news;
  const loaded = new GameState();
  loaded.deserialize(data);
  assert.deepEqual(loaded.settings.news, { hidden: false, entries: [] }, 'pre-R39 save loads');

  const gs = new GameState();
  addNewsEntry(gs.settings.news, 'Saved headline');
  addNewsEntry(gs.settings.news, 'خبر محفوظ');
  gs.settings.news.hidden = true;
  const back = new GameState();
  back.deserialize(JSON.parse(JSON.stringify(gs.serialize())));
  assert.deepEqual(back.settings.news.entries.map(e => e.text), ['Saved headline', 'خبر محفوظ']);
  assert.equal(back.settings.news.hidden, true);
}

console.log('--- built-in items and the rotation ---');
{
  const built = builtInItems(CHANGELOG);
  assert.equal(built[0].kind, 'new');
  assert.ok(built[0].text.includes(`v${VERSION}`), 'first item is what is new in this version');
  assert.ok(built.some(i => i.kind === 'tip') && built.some(i => i.kind === 'flavour'));
  assert.equal(builtInItems([]).some(i => i.kind === 'new'), false, 'no changelog, no "new" item');
  const q = buildQueue({ entries: [{ id: 'a', text: 'mine 1' }, { id: 'b', text: 'mine 2' }] }, CHANGELOG);
  assert.equal(q.length, built.length + 2);
  assert.equal(q[1].text, 'mine 1', 'player entries mix in after the first built-in item');
  assert.equal(q[3].text, 'mine 2');
  assert.equal(buildQueue(undefined, CHANGELOG).length, built.length);
}

console.log('--- escaping: player text only goes through textContent ---');
{
  const src = read('./js/ui/newsTicker.js');
  assert.ok(!/innerHTML|insertAdjacentHTML|outerHTML|document\.write/.test(src), 'no HTML sinks in newsTicker.js');
  assert.equal(cleanEntryText('<img src=x onerror=alert(1)>'), '<img src=x onerror=alert(1)>', 'markup is kept as plain text');
  const html = read('./index.html');
  assert.ok(html.includes('css/news.css'), 'stylesheet linked');
  assert.ok(html.includes('id="settings-news"'), 'Settings → News block');
}

console.log('R39 news ticker tests passed');
