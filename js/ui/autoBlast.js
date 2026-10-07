// Auto-Blast switch in Excavation (R32). The node is bought in the shard tree (Chronos); this row
// sits under the mining shop and only shows once the node is owned. Before that, a player who has
// earned shards sees a one-line pointer to the node. main.js calls init() once and update(tab)
// every frame; the row is built once and updated in place.
import { hasAutoBlast, isAutoBlastOn, setAutoBlastEnabled, getNode } from '../systems/ShardTreeSystem.js';

const setText = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };

export class AutoBlastUI {
  constructor(app) {
    this.app = app;
    this.el = null;
  }

  get gs() { return this.app.gameState; }

  init() {
    const anchor = document.getElementById('mining-pickaxe-info');
    if (!anchor || document.getElementById('mining-auto-blast')) return;
    const row = document.createElement('div');
    row.id = 'mining-auto-blast';
    row.style.cssText = 'display:flex; flex-wrap:wrap; align-items:center; gap:var(--sp-2) var(--sp-3); margin:0 0 0.75rem;';
    row.innerHTML = `
      <span class="eyebrow" data-ab="label">🧨 Auto-Blast</span>
      <div class="seg" role="group" aria-label="Auto-Blast" data-ab="seg">
        <button type="button" data-v="on" aria-pressed="false">On</button>
        <button type="button" data-v="off" aria-pressed="false">Off</button>
      </div>
      <span data-ab="status" style="font-size:var(--fs-12); color:var(--text-3); min-width:0;"></span>`;
    anchor.after(row);
    this.el = {
      row, seg: row.querySelector('[data-ab="seg"]'), status: row.querySelector('[data-ab="status"]')
    };
    this.el.seg.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-v]');
      if (!b || !hasAutoBlast(this.gs)) return;
      setAutoBlastEnabled(this.gs, b.dataset.v === 'on');
      this.update('mining');
    });
    this.update('mining');
  }

  update(tab) {
    if (tab !== 'mining' || !this.el) return;
    const gs = this.gs;
    const owned = hasAutoBlast(gs);
    // Not owned: point at the node once shards exist, else stay out of the way
    const hint = !owned && (gs.getShardCount?.() || 0) > 0;
    const show = owned || hint;
    if (this.el.row.hidden === show) this.el.row.hidden = !show;
    if (!show) return;
    if (this.el.seg.hidden === owned) this.el.seg.hidden = !owned;
    if (!owned) {
      const cost = getNode('chronos_auto_blast').cost;
      setText(this.el.status, `Unlock in the Share Tree (Chronos, ${cost} ◆): dynamite throws itself when ready.`);
      return;
    }
    const on = isAutoBlastOn(gs);
    for (const b of this.el.seg.children) {
      const v = String(b.dataset.v === (on ? 'on' : 'off'));
      if (b.getAttribute('aria-pressed') !== v) b.setAttribute('aria-pressed', v);
    }
    const cd = this.app.miningSystem?.dynamiteCooldown || 0;
    setText(this.el.status, on
      ? (cd > 0 ? `Next blast in ${Math.ceil(cd)} s, while the game is open.` : 'Blasting…')
      : 'Off: throw the dynamite by hand.');
  }
}
