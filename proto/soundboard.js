// Dig sound test page: plays the game's own sounds, from the game's own modules (nothing is copied).
import * as G from './game.js';
import './ui/app.js';              // the page host: loading it lets every feature add its sounds (we never call start())
import './features/ui.js';         // every feature's page side, so every sound is registered
import { sfx, unlock, setMuted, setVolume, setKit, audioTime } from './ui/audio.js';
import { KITS, STING_ZONES } from './features/picks/kits.js';
import { picksPlayAt } from './features/picks/ui.js';

const $ = id => document.getElementById(id);
const P = G.PARAMS.picks;
const LANDS = [['arabia', 'Arabia'], ['africa', 'Africa'], ['eastasia', 'East Asia'], ['americas', 'Americas'], ['europe', 'Europe']];
const DEPTHS = ['Surface', 'The Black', 'The Living Rock', 'The Angry Layer', 'The Hot Layer'];
const fill = (el, items) => { for (const [v, label] of items) { const o = document.createElement('option'); o.value = v; o.textContent = label; el.appendChild(o); } };
const landName = z => (LANDS.find(l => l[0] === z) || [0, z])[1];

fill($('picks'), [1, 2, 3, 4].map(n => [n, n === 1 ? '1 pick' : n + ' picks']));
fill($('speed'), P.tempos.map(b => [b, b + ' a minute']));
fill($('land'), LANDS);
fill($('depth'), DEPTHS.map((d, i) => [i, d]));

// ---------- volume, mute, unlock ----------
let unlocked = false;
const wake = () => { unlock(); if (!unlocked) { unlocked = true; $('status').textContent = 'Sound is on.'; } };
addEventListener('pointerdown', wake, true);
addEventListener('keydown', wake, true);
$('vol').addEventListener('input', e => setVolume(Number(e.target.value)));
$('mute').addEventListener('click', () => { const m = $('mute').textContent.endsWith('off'); setMuted(m); $('mute').textContent = 'Mute: ' + (m ? 'on' : 'off'); });

// ---------- the beat ----------
const steps = $('steps');
const dots = [];
for (let i = 0; i < 16; i++) { const d = document.createElement('i'); d.innerHTML = '<b>' + (i + 1) + '</b>'; steps.appendChild(d); dots.push(d); }
const choice = () => ({ count: Number($('picks').value), bpm: Number($('speed').value), zone: $('land').value, depth: Number($('depth').value) });
const barOf = c => G.picksBarOf(c.count, c.zone);

function showBar() {
  const c = choice(), bar = barOf(c);
  setKit(c.zone, c.depth);
  dots.forEach((d, i) => { d.className = (bar.n[i] ? 'n v-' + bar.v[i] : '') + (i % 4 === 0 ? ' beat' : ''); });
  $('barname').textContent = G.t(bar.name);
  $('barinfo').textContent = bar.v.join(' ') + '    ' + landName(c.zone) + ', ' + DEPTHS[c.depth] + ', ' + c.bpm + ' a minute';
}
let playing = false, timer = 0, pos = 0, nextT = 0, lit = -1;
const lights = [];     // { at (clock time), slot }
const LOOK = 0.12;     // seconds scheduled ahead of the audio clock
const clock = () => { const a = audioTime(); return a === null ? performance.now() / 1000 : a; };

for (const id of ['picks', 'speed', 'land', 'depth']) $(id).addEventListener('change', () => { showBar(); if (playing) start(); });
$('crew').addEventListener('change', () => { if (playing) start(); });

function tick() {
  const c = choice(), bar = barOf(c), step = 15 / c.bpm, now = clock();
  setKit(c.zone, c.depth);
  while (nextT < now + LOOK) {
    const slot = pos % 16, n = bar.n[slot], at = Math.max(0, nextT - now);
    if (n) picksPlayAt(at, P.gain[bar.v[slot]] || 1, () => sfx.hit(false));
    else if ($('crew').checked && slot % 4 === 2) picksPlayAt(at, P.crewGain, () => sfx.crew());
    lights.push({ at: nextT, slot });
    pos++; nextT += step;
  }
}
function paint() {
  if (!playing) return;
  const now = clock();
  while (lights.length && lights[0].at <= now) { const l = lights.shift(); if (lit >= 0) dots[lit].classList.remove('on'); lit = l.slot; dots[lit].classList.add('on'); }
  requestAnimationFrame(paint);
}
function halt() { playing = false; clearInterval(timer); if (lit >= 0) dots[lit].classList.remove('on'); lit = -1; lights.length = 0; }
function start() {
  wake(); halt(); playing = true; pos = 0; nextT = clock() + 0.05;
  $('play').textContent = 'Stop'; $('play').classList.add('on');
  timer = setInterval(tick, 25); tick(); requestAnimationFrame(paint);
}
function stop() { halt(); $('play').textContent = 'Play'; $('play').classList.remove('on'); }
$('play').addEventListener('click', () => (playing ? stop() : start()));

// ---------- one-shot sounds ----------
// A sound is put in a group by its name; one that matches nothing lands in "Other", so a new sound still shows up.
const ORDER = ['Pick and hits', 'Rock', 'Chests and relics', 'Rewards (Stars, finish)', 'Rafeeqs', 'Lands (stings and kit voices)', 'Other'];
const RULES = [
  [/^(hit|crit|break|comboUp)$/, 'Pick and hits'],
  [/^(crew|job|arrive|foreman)/, 'Rafeeqs'],
  [/^(star|stamp|buy|deny|coin|record|bossDown)$/, 'Rewards (Stars, finish)'],
  [/^(chest|relic|forge|fz|fusion|wing)/, 'Chests and relics'],
  [/^(bossHit|rubble|blast|gusher|fossil|water|deep|chime|shatter|glass|sand|throwOre)/, 'Rock'],
];
const groupOf = name => (RULES.find(([re]) => re.test(name)) || [0, 'Other'])[1];
// sounds that take an argument: a few variants of it
const ARGS = { hit: [[false], [true]], break: [[3, false], [8, true]], coin: [[3]], comboUp: [[0], [3]], chime: [[0], [3]], wingPiece: [[false], [true]], rubble: [[false], [true]] };
const LABEL = { hit: 'Hit', crit: 'Lucky hit', break: 'Break', crew: 'Rafeeq swing', coin: 'Coin tick', comboUp: 'Combo up', star: 'Star', buy: 'Buy', deny: 'No' };
const VARIANT = { hit: ['small', 'big'], break: ['plain', 'ore'], comboUp: ['low', 'high'], chime: ['first', 'fourth'], wingPiece: ['common', 'rare'], rubble: ['rock', 'chest'] };
const nice = n => LABEL[n] || (n.startsWith('relics2') ? 'Relic ' + n.slice(7) : n.startsWith('fz') ? 'Fusion ' + n.slice(2) : '') || n.replace(/([A-Z0-9])/g, ' $1').replace(/^./, c => c.toUpperCase());

function button(label, fn, title) {
  const b = document.createElement('button');
  b.textContent = label; b.title = title || '';
  b.addEventListener('click', () => {
    wake();
    const c = choice(); setKit(c.zone, c.depth);
    try { fn(); } catch (e) { console.error(e); $('status').textContent = 'Error in ' + label + ': ' + e.message; }
  });
  return b;
}

const sections = Object.fromEntries(ORDER.map(g => [g, []]));
for (const name of Object.keys(sfx)) {
  if (name === 'picksSting') continue;           // shown under Lands
  const variants = ARGS[name] || [[]];
  variants.forEach((a, i) => {
    const label = nice(name) + (variants.length > 1 ? ' (' + (VARIANT[name] ? VARIANT[name][i] : i + 1) + ')' : '');
    sections[groupOf(name)].push(button(label, () => sfx[name](...a), name + '(' + a.join(', ') + ')'));
  });
}
const lands = sections['Lands (stings and kit voices)'];
for (const z of STING_ZONES) lands.push(button(landName(z) + ' sting', () => sfx.picksSting(z), 'picksSting("' + z + '")'));
for (const z of Object.keys(KITS)) for (const n of ['hit', 'crit', 'crew']) {
  lands.push(button(landName(z) + ' ' + (LABEL[n] || n).toLowerCase(), () => { setKit(z, choice().depth); sfx[n](n === 'hit' ? false : undefined); }, 'kit voice: ' + z + ' ' + n));
}

const host = $('sounds');
for (const g of ORDER) {
  if (!sections[g].length) continue;
  const h = document.createElement('h2'); h.textContent = g; host.appendChild(h);
  const s = document.createElement('section'); s.className = 'grid';
  if (g.startsWith('Lands')) { const n = document.createElement('p'); n.className = 'sub'; n.textContent = 'Kit voices play in the depth layer chosen above. Arabia plays the plain sounds (see Pick and hits).'; s.appendChild(n); }
  sections[g].forEach(b => s.appendChild(b));
  host.appendChild(s);
}
showBar();
