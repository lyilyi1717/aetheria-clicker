// Dig feature (page side): the hakawati, the storyteller who sits in Alqahwa. LOOKS AND WORDS ONLY.
// - drawing: an old man on a low cushion with a big book, in the same ink-outlined style as the Rafeeqs and the manager
// - telling: on entering Alqahwa, the newest unheard beat (about three lines) and the lost-try line, one bubble at a time; Next or Skip
// - the book: a small "Story" button; the chapters, and any unlocked beat can be read again
// - the finale: at level 20 the caravan walks across the coffee house
// - the finish card teaser: "The hakawati has a new story at Alqahwa." (added to the card after it opens)
// Rules and words: ./rules.js, ./strings.js. Everything here lives inside the Alqahwa window (there is only ever one window open).
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import { sfx } from '../../ui/audio.js';

const { t } = G;
const INK = '#2b1a0c';
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- the drawing (the origin is the feet, y up is negative) ----------
export function drawHakawati(g, T, talking) {
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = 2; g.strokeStyle = INK;
  const bob = reduced ? 0 : Math.sin(T * 2) * 0.8;
  // the cushion
  g.fillStyle = '#7b3a8c'; g.beginPath(); g.roundRect(-30, -8, 60, 14, 7); g.fill(); g.stroke();
  // crossed legs and a long grey thobe
  g.fillStyle = '#d8d2c0'; g.beginPath(); g.moveTo(-26, -6); g.quadraticCurveTo(-24, -34, -12, -48 + bob); g.lineTo(12, -48 + bob); g.quadraticCurveTo(24, -34, 26, -6); g.closePath(); g.fill(); g.stroke();
  // the big book on his knees
  g.fillStyle = '#8f2a1f'; g.beginPath(); g.roundRect(-18, -26, 36, 20, 3); g.fill(); g.stroke();
  g.fillStyle = '#f3e6c4'; g.fillRect(-15, -23, 30, 14); g.strokeRect(-15, -23, 30, 14);
  g.strokeStyle = '#b79b6a'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-12, -19 + i * 4); g.lineTo(12, -19 + i * 4); g.stroke(); }
  g.strokeStyle = INK; g.lineWidth = 2;
  // the hands: one holds the book, one waves a story in the air while he talks
  g.fillStyle = '#e3b48a';
  const wave = talking && !reduced ? Math.sin(T * 7) * 5 : 0;
  g.beginPath(); g.arc(-17, -24, 4, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.arc(21 + wave, -40 - Math.abs(wave), 4, 0, 7); g.fill(); g.stroke();
  // the head, a white beard, big eyebrows
  g.fillStyle = '#e3b48a'; g.beginPath(); g.arc(0, -58 + bob, 12, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#f6f2e8'; g.beginPath(); g.moveTo(-11, -56 + bob); g.quadraticCurveTo(0, -30 + bob, 11, -56 + bob); g.quadraticCurveTo(0, -50 + bob, -11, -56 + bob); g.fill(); g.stroke();
  g.fillStyle = INK; g.beginPath(); g.arc(-4.5, -60 + bob, 1.5, 0, 7); g.arc(4.5, -60 + bob, 1.5, 0, 7); g.fill();
  g.lineWidth = 2.5; g.beginPath(); g.moveTo(-8, -64 + bob); g.lineTo(-2, -63 + bob); g.moveTo(8, -64 + bob); g.lineTo(2, -63 + bob); g.stroke();
  if (talking) { g.fillStyle = INK; g.beginPath(); g.ellipse(0, -52 + bob, 2.5, 1.5 + (reduced ? 0 : Math.abs(Math.sin(T * 9))), 0, 0, 7); g.fill(); }
  // the white ghutra with a black agal
  g.fillStyle = '#fbf7ea'; g.lineWidth = 2; g.beginPath(); g.moveTo(-14, -56 + bob); g.quadraticCurveTo(-14, -76 + bob, 0, -76 + bob); g.quadraticCurveTo(14, -76 + bob, 14, -56 + bob); g.lineTo(11, -60 + bob); g.lineTo(-11, -60 + bob); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.ellipse(0, -69 + bob, 12, 3, 0, 0, 7); g.stroke();
  g.restore();
}
// a camel, small, for the finale (the origin is the feet)
function camel(g, ph) {
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 2; g.fillStyle = '#d9b27a';
  const st = Math.sin(ph) * 4;
  g.beginPath(); g.moveTo(-20, -8); g.lineTo(-20 + st, 0); g.moveTo(-8, -8); g.lineTo(-8 - st, 0); g.moveTo(8, -8); g.lineTo(8 + st, 0); g.moveTo(20, -8); g.lineTo(20 - st, 0); g.stroke();
  g.beginPath(); g.moveTo(-24, -10); g.quadraticCurveTo(-22, -26, -10, -24); g.quadraticCurveTo(-4, -34, 2, -24); g.lineTo(14, -22); g.lineTo(22, -34); g.lineTo(30, -34); g.lineTo(30, -28); g.lineTo(24, -26); g.lineTo(22, -10); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#a8322a'; g.beginPath(); g.roundRect(-8, -26, 16, 8, 3); g.fill(); g.stroke();
  g.restore();
}

// ---------- the desk: the hakawati in one Alqahwa window ----------
// host: the Alqahwa modal element; stage: its .qh-stage (the canvas and the overlay live there); btns: the button row.
// Returns { x, draw(g, T, CW, GROUND), stop() }.
export function openDesk(app, host, { stage, btns, CW = 960 }) {
  const s = app.state;
  const X = 0.46;                                                // where he sits, as a fraction of the room
  let talking = false, finaleT = -1, T0 = 0;
  const pane = document.createElement('div');
  pane.className = 'st-pane'; pane.hidden = true;
  pane.innerHTML = '<div class="st-top"><b class="st-name"></b><span class="st-ch"></span></div><p class="st-line"></p><div class="st-btns"><button class="ghost st-skip"></button><span class="st-gap"></span><button class="primary gold st-next"></button></div>';
  stage.appendChild(pane);
  const book = document.createElement('div');
  book.className = 'st-book'; book.hidden = true;
  stage.appendChild(book);
  const bookBtn = document.createElement('button');
  bookBtn.className = 'ghost st-open';
  btns.insertBefore(bookBtn, btns.firstChild);
  const $ = q => pane.querySelector(q);
  $('.st-name').textContent = t('st_name'); $('.st-skip').textContent = t('st_skip');

  const label = () => {
    const un = G.storyUnread(s).length;
    bookBtn.innerHTML = ''; bookBtn.append(t('st_book'));
    if (un) { const b = document.createElement('span'); b.className = 'st-dot'; b.textContent = String(un); b.title = t('st_new'); bookBtn.appendChild(b); }
  };
  label();

  // tell a list of lines { key, n? (beat), ch? (chapter label), end? (ends the legend), lost? }; done() when finished or skipped
  function tell(lines, done) {
    let i = 0;
    const show = () => {
      const L = lines[i];
      $('.st-line').textContent = t(L.key);
      $('.st-ch').textContent = L.ch || '';
      $('.st-next').textContent = i === lines.length - 1 ? t('st_done') : t('st_next');
      pane.hidden = false; talking = true;
    };
    const finish = () => {
      pane.hidden = true; talking = false;
      G.storyHeard(s, lines);
      label(); app.save && app.save();
      if (done) done();
    };
    $('.st-next').onclick = () => { app.unlockAudio && app.unlockAudio(); if (++i >= lines.length) finish(); else { show(); sfx.click && sfx.click(); } };
    $('.st-skip').onclick = () => finish();
    pane.onclick = e => { if (e.target === pane || e.target.classList.contains('st-line')) $('.st-next').click(); };
    show();
  }
  const chapterLabel = n => {
    const b = G.STORY_BEATS[n - 1];
    return t('st_chapter', { n: b.chapter }) + ': ' + t('st_ch_' + b.zone);
  };
  const beatLines = n => G.storyKeys(n).map(key => ({ key, n: n, ch: chapterLabel(n) }));

  let kind = '';
  function finale(k) {
    kind = k; finaleT = 0; T0 = -1;
    sfx.coin && sfx.coin(5);
    app.toast && app.toast(t(k === 'bell' ? 'st_bell' : 'st_found'), 'gold');
  }
  // the book
  function openBook() {
    pane.hidden = true; talking = false;
    book.hidden = false; book.innerHTML = '';
    const h = document.createElement('div'); h.className = 'st-bh';
    h.innerHTML = '<b></b><span></span>'; h.firstChild.textContent = t('st_book_title'); h.lastChild.textContent = t('st_book_sub');
    const x = document.createElement('button'); x.className = 'ghost st-x'; x.textContent = t('st_close'); x.onclick = () => { book.hidden = true; label(); };
    h.appendChild(x); book.appendChild(h);
    const un = G.storyUnlocked(s);
    if (!un) { const p = document.createElement('p'); p.className = 'st-empty'; p.textContent = t('st_empty'); book.appendChild(p); }
    for (const ch of G.storyBook(s)) {
      const row = document.createElement('div'); row.className = 'st-chap';
      const tt = document.createElement('b'); tt.textContent = t('st_chapter', { n: ch.no }) + ': ' + t('st_ch_' + ch.zone); row.appendChild(tt);
      const list = document.createElement('div'); list.className = 'st-beats';
      for (const b of ch.beats) {
        const e = document.createElement('button'); e.className = 'ghost st-beat' + (b.open && !b.read ? ' new' : '');
        e.textContent = t('st_part', { n: b.n }); e.disabled = !b.open;
        if (!b.open) e.title = t('st_locked', { n: b.n });
        if (b.open && !b.read) { const d = document.createElement('i'); d.textContent = t('st_new'); e.appendChild(d); }
        e.onclick = () => { book.hidden = true; tell(beatLines(b.n), () => { if (b.end) finale(b.end); openBook(); }); };
        list.appendChild(e);
      }
      row.appendChild(list); book.appendChild(row);
    }
  }
  bookBtn.addEventListener('click', () => { app.unlockAudio && app.unlockAudio(); if (book.hidden) openBook(); else { book.hidden = true; label(); } });
  const cv = stage.querySelector('canvas');
  cv.addEventListener('click', e => {
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
    if (Math.abs(x - X) < 0.06 && book.hidden && pane.hidden) openBook();
  });
  cv.style.cursor = 'default';

  // on entering: the newest unheard beat, then the lost-try line if the next level was lost
  const beat = G.storyNew(s), lost = G.storyLostLine(s);
  const seq = [];
  if (beat) seq.push(...beatLines(beat));
  if (lost) seq.push({ key: lost, lost: true, ch: beat ? '' : t('st_name') });
  if (seq.length) {
    // a short pause so the room is seen first
    setTimeout(() => { if (host.isConnected && book.hidden) tell(seq, () => { if (beat && G.storyIsEnd(beat)) finale(G.storyIsEnd(beat)); }); }, reduced ? 0 : 600);
  }

  return {
    x: X,
    draw(g, T, CW2, GROUND) {
      g.save(); g.translate(X * CW2, GROUND + 6); g.scale(1.25, 1.25); drawHakawati(g, T, talking); g.restore();
      g.fillStyle = '#ffd23f'; g.font = 'bold 11px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(t('st_name'), X * CW2, GROUND + 28);
      // the brass bell hangs from a cord over the table once its ending was told, and sways; it rings wide for nine seconds after the telling
      if (G.storyBellHangs(s) || kind === 'bell') {
        if (kind === 'bell' && finaleT >= 0 && T0 < 0) T0 = T;
        const ring = kind === 'bell' && finaleT >= 0 ? Math.max(0, 1 - (T - T0) / 9) : 0;
        const sw = reduced ? 0 : Math.sin(T * (ring ? 6 : 1.6)) * (0.05 + 0.35 * ring);
        g.save(); g.translate(X * CW2 + 80, 30); g.strokeStyle = INK; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, -30); g.lineTo(0, 0); g.stroke();
        g.rotate(sw); g.translate(0, 24); g.fillStyle = '#d8a328'; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(-14, 26); g.quadraticCurveTo(-14, -2, 0, -4); g.quadraticCurveTo(14, -2, 14, 26); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.arc(0, 29, 4, 0, 7); g.fill(); g.stroke(); g.restore();
      }
      if (finaleT >= 0) {
        if (T0 < 0) T0 = T;
        const k = (T - T0) / 9;                              // nine seconds across the room, then the camels stay home at the right end
        if (k > 1.2) { finaleT = -1; kind = ''; return; }
        if (kind === 'bell') return;                         // the bell is drawn below, ringing wide for these seconds
        for (let i = 0; i < 5; i++) {
          const f = reduced ? 0.3 + i * 0.1 : Math.min(1, Math.max(0, k * 1.1 - i * 0.07));
          g.save(); g.translate(-40 + f * (CW2 * 0.62), GROUND + 4 - 36); g.scale(1.3, 1.3); camel(g, T * 6 + i); g.restore();
        }
      }
    },
    stop() { talking = false; },
  };
}

// ---------- the teaser on the finish card ----------
ui({
  id: 'story',
  css: new URL('./story.css', import.meta.url).href,
  on: {
    siteFinished(d, app) {
      const key = G.storyTeaser(app.state);
      if (!key) return;
      setTimeout(() => {
        const card = document.querySelector('#modal .card.finish');
        if (!card || card.querySelector('.st-tease')) return;
        const p = document.createElement('p'); p.className = 'more st-tease'; p.textContent = t(key);
        const sub = card.querySelector('.sub, .gate');
        if (sub) sub.insertAdjacentElement('afterend', p); else card.appendChild(p);
      }, 120);
    },
  },
});
