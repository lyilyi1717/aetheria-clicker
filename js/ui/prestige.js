// Transcendence panel (prestige layer 2, roadmap R4). Built once into #transcendence-section and
// updated in place from main's updatePrestigeUI (rebuilding every frame swallowed clicks).
// Shows the gate, the shard multipliers, the generator ladder and the exact trade before confirm.
import { BigNum } from '../engine/BigNum.js';
import { MAX_TIER_COUNT } from '../systems/BuildingSystem.js';
import { TERMS as T } from '../data/strings.js';

const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };

// Multipliers can pass 1e308 (shards x lifetime dust), so they are BigNums
export function fmtBigMult(v) {
  const b = v instanceof BigNum ? v : new BigNum(v);
  if (b.lt(1e6)) {
    const n = b.toNumber();
    return `×${n >= 10 ? n.toLocaleString(undefined, { maximumFractionDigits: 1 }) : n.toFixed(2)}`;
  }
  return `×${b.format('scientific', 2)}`;
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
.tr-trade ul { margin: 0.25rem 0 0; padding-left: 1.1rem; }
.tr-trade li { overflow-wrap: anywhere; }
.tr-gain { background: color-mix(in srgb, var(--life) 8%, transparent); border: 1px solid color-mix(in srgb, var(--life) 35%, transparent); }
.tr-lose { background: color-mix(in srgb, var(--danger) 7%, transparent); border: 1px solid color-mix(in srgb, var(--danger) 30%, transparent); }
.tr-trade .h { font-weight: 700; }
.tr-keep, .tr-note { font-size: 0.8rem; color: var(--text-dim); }
.tr-note { border-left: 3px solid var(--accent-gold); padding-left: 0.5rem; color: var(--text-muted); }
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
        <p class="tr-keep" style="margin:0">The second prestige layer. Each ${T.reset2Noun} pays 2 ${T.reset2Currency}
          (each ×1.5 ${T.currency} and ×1.5 ${T.reset1Currency} gain, forever) and opens the next generator tier.</p>
        <div class="tr-note" data-tr="legacy" hidden></div>
        <div class="tr-stats">
          <div class="tr-stat"><div class="k">${T.reset2Currency}</div><div class="v" data-tr="shards"></div></div>
          <div class="tr-stat"><div class="k">${T.shareBonus}</div><div class="v" data-tr="shardMult"></div></div>
          <div class="tr-stat"><div class="k">${T.reset2Plural}</div><div class="v" data-tr="count"></div></div>
          <div class="tr-stat"><div class="k">Generator tiers</div><div class="v" data-tr="tiers"></div></div>
        </div>
        <div class="tr-gate-text" data-tr="gateText"></div>
        <div class="tr-gate-bar"><div class="tr-gate-fill" data-tr="gateFill"></div></div>
        <div class="tr-trade">
          <div class="tr-gain"><div class="h">You gain</div><ul data-tr="gain"></ul></div>
          <div class="tr-lose"><div class="h">You reset</div><ul data-tr="lose"></ul></div>
        </div>
        <div class="tr-keep">You keep: generator tiers, ${T.reset2Currency}, the ${T.shareTree}, talents, Tower, Excavation, Garden,
          Alchemy, Bazaar, Codex and your ${T.reset1Noun} count.</div>
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
    ul.replaceChildren(...items.map(t => { const li = document.createElement('li'); li.textContent = t; return li; }));
  }

  tradeLines(tp) {
    const gain = [
      `+${tp.shardsGained} ${T.reset2Currency} (${tp.shardsBefore} → ${tp.shardsAfter})`,
      ...(tp.sealShards > 0 ? [`+${tp.sealShards} more ${T.reset2Short} to spend in the ${T.shareTree} (lit Seals; they do not raise the bonus)`] : []),
      `${T.currency} ${fmtBigMult(tp.shardBefore)} → ${fmtBigMult(tp.shardAfter)} from ${T.reset2Short}`,
      `${T.reset1Currency} gain ${fmtBigMult(tp.dustGainBefore)} → ${fmtBigMult(tp.dustGainAfter)}`,
      tp.newTier ? `New generator: ${tp.newTier.icon} ${tp.newTier.name} (tier ${tp.newTier.tier})`
        : `Generator ladder already complete (${MAX_TIER_COUNT} tiers)`
    ];
    const lose = [
      `${T.reset1Short} multiplier ${fmtBigMult(tp.dustBefore)} → ${fmtBigMult(tp.dustAfter)} (this layer's lifetime ${T.reset1Short} starts again at 0)`,
      `${T.reset1Currency} and every ${T.reset1Shop} purchase (Auto-Buy, Blueprint Memory, Hourglass, ...)`,
      `The run: ${T.currency} and generators (like a ${T.reset1Noun})`
    ];
    return { gain, lose };
  }

  onTranscend() {
    if (!this.ps.canTranscend()) return;
    const tp = this.ps.getTranscendPreview();
    const { gain, lose } = this.tradeLines(tp);
    const msg = `${T.reset2}?\n\nYou gain:\n- ` + gain.join('\n- ') +
      '\n\nYou reset:\n- ' + lose.join('\n- ') +
      `\n\n${T.reset1Short} × ${T.reset2Short} multiplier right after: ${fmtBigMult(tp.before)} → ${fmtBigMult(tp.after)}.` +
      ` ${T.reset1Short} now refill ` + fmtBigMult(tp.dustGainAfter) + ' as fast, so production usually catches up within a day.' +
      `\nNext ${T.reset2Noun} at ${tp.nextGate.format('standard', 0)} lifetime ${T.reset1Short}.`;
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
      (gs.totalFractureShards.gt(gs.fractureShards) ? ` (${gs.totalFractureShards.format('standard', 0)} earned)` : ''));
    setText(this.el.shardMult, `${fmtBigMult(tp.shardBefore)} ${T.currency} & ${T.reset1Short}`);
    setText(this.el.count, String(gs.transcendenceCount || 0));
    setText(this.el.tiers, `${tp.tiersBefore} / ${MAX_TIER_COUNT}`);

    const dust = gs.totalCosmicDust;
    const pct = canT ? 100 : Math.max(0, Math.min(100, dust.div(tp.gate).toNumber() * 100));
    const w = `${pct.toFixed(1)}%`;
    if (this.el.gateFill.style.width !== w) this.el.gateFill.style.width = w;
    setText(this.el.gateText, `Lifetime ${T.reset1Short} this layer: ${dust.format('standard', 0)} / ${tp.gate.format('standard', 0)}` +
      (canT ? ' — ready!' : ''));

    const { gain, lose } = this.tradeLines(tp);
    this.setList(this.el.gain, gain);
    this.setList(this.el.lose, lose);

    const legacy = gs.legacyTranscendRefund;
    if (legacy && this.el.legacy.hidden) {
      this.el.legacy.hidden = false;
      const dustBack = BigNum.fromJSON(legacy.dust).format('standard', 0);
      const one = legacy.transcends === 1;
      this.el.legacy.textContent = `${T.reset2Plural} were reworked. Your ${legacy.transcends} earlier ` +
        `${one ? `${T.reset2Noun} now counts` : `${T.reset2Plural} now count`} under the new rules: ${legacy.shards} ${T.reset2Currency}` +
        ` and ${dustBack} ${T.reset1Currency} returned.`;
    }

    setText(this.el.btn, canT ? `${T.reset2CurrencyIcon} ${T.reset2}!` : `Locked (needs ${tp.gate.format('standard', 0)} lifetime ${T.reset1Short})`);
    this.el.btn.classList.toggle('active', canT);
    this.el.btn.classList.toggle('disabled', !canT);
  }
}
