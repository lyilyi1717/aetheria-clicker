// Transcendence panel (prestige layer 2, roadmap R4). Built once into #transcendence-section and
// updated in place from main's updatePrestigeUI (rebuilding every frame swallowed clicks).
// Shows the gate, the shard multipliers, the generator ladder and the exact trade before confirm.
import { BigNum } from '../engine/BigNum.js';
import { MAX_TIER_COUNT } from '../systems/BuildingSystem.js';
import { TERMS as T } from '../data/strings.js';
import { t, bidi } from '../i18n/index.js';

const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };

// Multipliers can pass 1e308 (shards x lifetime dust), so they are BigNums
export function fmtBigMult(v) {
  const b = v instanceof BigNum ? v : new BigNum(v);
  if (b.lt(1e6)) {
    const n = b.toNumber();
    return bidi(`×${n >= 10 ? n.toLocaleString('en-US', { maximumFractionDigits: 1 }) : n.toFixed(2)}`);
  }
  return bidi(`×${b.format('scientific', 2)}`);
}

const STYLE = `
.tr-box { display: flex; flex-direction: column; gap: 0.6rem; }
.tr-box h3 { margin: 0; }
.tr-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.5rem; }
.tr-stat { background: color-mix(in srgb, var(--tint) 4%, transparent); border: 1px solid color-mix(in srgb, var(--tint) 8%, transparent); border-radius: 8px; padding: 0.45rem 0.6rem; min-width: 0; }
.tr-stat .k { font-size: 0.72rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.04em; }
.tr-stat .v { font-weight: 700; color: var(--accent-rose); overflow-wrap: anywhere; }
.tr-gate-bar { height: 8px; border-radius: 4px; background: color-mix(in srgb, var(--tint) 8%, transparent); overflow: hidden; }
.tr-gate-fill { height: 100%; width: 0; background: linear-gradient(90deg, var(--accent-purple), var(--accent-rose)); transition: width 0.3s; }
.tr-gate-text { font-size: 0.85rem; color: var(--text-muted); overflow-wrap: anywhere; }
.tr-trade { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.tr-trade > div { border-radius: 8px; padding: 0.5rem 0.6rem; font-size: 0.85rem; min-width: 0; }
.tr-trade ul { margin: 0.25rem 0 0; padding-inline-start: 1.1rem; }
.tr-trade li { overflow-wrap: anywhere; }
.tr-gain { background: color-mix(in srgb, var(--life) 8%, transparent); border: 1px solid color-mix(in srgb, var(--life) 35%, transparent); }
.tr-lose { background: color-mix(in srgb, var(--danger) 7%, transparent); border: 1px solid color-mix(in srgb, var(--danger) 30%, transparent); }
.tr-trade .h { font-weight: 700; }
.tr-keep, .tr-note { font-size: 0.8rem; color: var(--text-dim); }
.tr-note { border-inline-start: 3px solid var(--accent-gold); padding-inline-start: 0.5rem; color: var(--text-muted); }
@media (max-width: 600px) { .tr-trade { grid-template-columns: 1fr; } }
`;

export class TranscendPanel {
  constructor(app) {
    this.app = app;
    this.el = {};
  }

  get ps() { return this.app.prestigeSystem; }
  get gs() { return this.app.gameState; }

  build() {
    const cont = document.getElementById('transcendence-section');
    if (!cont || cont.dataset.built) return;
    cont.dataset.built = '1';
    if (!document.getElementById('tr-style')) {
      const st = document.createElement('style');
      st.id = 'tr-style';
      st.textContent = STYLE;
      document.head.appendChild(st);
    }
    cont.innerHTML = `
      <div class="transcend-box tr-box">
        <h3>${T.reset2CurrencyIcon} ${T.reset2}</h3>
        <p class="tr-keep" style="margin:0">${t('tr.intro')}</p>
        <div class="tr-note" data-tr="legacy" hidden></div>
        <div class="tr-stats">
          <div class="tr-stat"><div class="k">${T.reset2Currency}</div><div class="v" data-tr="shards"></div></div>
          <div class="tr-stat"><div class="k">${T.shareBonus}</div><div class="v" data-tr="shardMult"></div></div>
          <div class="tr-stat"><div class="k">${T.reset2Plural}</div><div class="v" data-tr="count"></div></div>
          <div class="tr-stat"><div class="k">${t('tr.tiers')}</div><div class="v" data-tr="tiers"></div></div>
        </div>
        <div class="tr-gate-text" data-tr="gateText"></div>
        <div class="tr-gate-bar"><div class="tr-gate-fill" data-tr="gateFill"></div></div>
        <div class="tr-trade">
          <div class="tr-gain"><div class="h">${t('tr.gain')}</div><ul data-tr="gain"></ul></div>
          <div class="tr-lose"><div class="h">${t('tr.lose')}</div><ul data-tr="lose"></ul></div>
        </div>
        <div class="tr-keep">${t('tr.keep')}</div>
        <button id="btn-do-transcend" class="btn-action"></button>
      </div>
    `;
    for (const node of cont.querySelectorAll('[data-tr]')) this.el[node.dataset.tr] = node;
    this.el.btn = document.getElementById('btn-do-transcend');
    this.el.btn.addEventListener('click', () => this.onTranscend());
    this.update();
  }

  // Bullet lists as text (rebuilt only when the text changes)
  setList(ul, items) {
    const key = items.join('\n');
    if (!ul || ul.dataset.key === key) return;
    ul.dataset.key = key;
    ul.replaceChildren(...items.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
  }

  tradeLines(tp) {
    const gain = [
      t('tr.g.shares', { n: tp.shardsGained, a: tp.shardsBefore, b: tp.shardsAfter }),
      ...(tp.sealShards > 0 ? [t('tr.g.seals', { n: tp.sealShards })] : []),
      t('tr.g.oil', { a: fmtBigMult(tp.shardBefore), b: fmtBigMult(tp.shardAfter) }),
      tp.newTier ? t('tr.g.tier', { icon: tp.newTier.icon, name: tp.newTier.name, n: tp.newTier.tier })
        : t('tr.g.ladder', { n: MAX_TIER_COUNT })
    ];
    const lose = [
      t('tr.l.mult', { a: fmtBigMult(tp.dustBefore), b: fmtBigMult(tp.dustAfter) }),
      t('tr.l.shop'),
      t('tr.l.run')
    ];
    return { gain, lose };
  }

  onTranscend() {
    if (!this.ps.canTranscend()) return;
    const tp = this.ps.getTranscendPreview();
    const { gain, lose } = this.tradeLines(tp);
    const msg = t('tr.confirm.q') + '\n\n' + t('tr.gain') + ':\n- ' + gain.join('\n- ') +
      '\n\n' + t('tr.lose') + ':\n- ' + lose.join('\n- ') +
      '\n\n' + t('tr.confirm.after', { a: fmtBigMult(tp.before), b: fmtBigMult(tp.after) }) +
      '\n' + t('tr.confirm.next', { n: tp.nextGate.format('standard', 0) });
    if (!confirm(msg)) return;
    this.ps.transcend();
    // New tier cards appear; the dust shop and dust were reset
    this.app.updateBuildingsUI();
    this.app.updatePrestigeUI();
  }

  update() {
    if (!this.el.btn) return;
    const gs = this.gs;
    const tp = this.ps.getTranscendPreview();
    const canT = this.ps.canTranscend();

    setText(this.el.shards, gs.fractureShards.format('standard', 0) +
      (gs.totalFractureShards.gt(gs.fractureShards) ? ' ' + t('tr.earned', { n: gs.totalFractureShards.format('standard', 0) }) : ''));
    setText(this.el.shardMult, t('tr.mult', { x: fmtBigMult(tp.shardBefore) }));
    setText(this.el.count, String(gs.transcendenceCount || 0));
    setText(this.el.tiers, `${tp.tiersBefore} / ${MAX_TIER_COUNT}`);

    const dust = gs.totalCosmicDust;
    const pct = canT ? 100 : Math.max(0, Math.min(100, dust.div(tp.gate).toNumber() * 100));
    const w = `${pct.toFixed(1)}%`;
    if (this.el.gateFill.style.width !== w) this.el.gateFill.style.width = w;
    setText(this.el.gateText, t('tr.gate', { a: dust.format('standard', 0), b: tp.gate.format('standard', 0) }) +
      (canT ? ' ' + t('tr.ready') : ''));

    const { gain, lose } = this.tradeLines(tp);
    this.setList(this.el.gain, gain);
    this.setList(this.el.lose, lose);

    const legacy = gs.legacyTranscendRefund;
    if (legacy && this.el.legacy.hidden) {
      this.el.legacy.hidden = false;
      const dustBack = BigNum.fromJSON(legacy.dust).format('standard', 0);
      const one = legacy.transcends === 1;
      this.el.legacy.textContent = t(one ? 'tr.legacy1' : 'tr.legacy', { n: legacy.transcends, s: legacy.shards, d: dustBack });
    }

    setText(this.el.btn, canT ? `${T.reset2CurrencyIcon} ${T.reset2}!` : t('tr.locked', { n: tp.gate.format('standard', 0) }));
    this.el.btn.classList.toggle('active', canT);
    this.el.btn.classList.toggle('disabled', !canT);
  }
}
