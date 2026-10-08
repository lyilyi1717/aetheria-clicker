// Void Tower monster / boss portrait (the image pane in #monster-arena-box).
//
// Art lookup is data-driven: nothing here needs code changes to add art.
//
// BOSS ART CONTRACT (new art goes here):
//   File:  assets/generated/bosses/zone<N>_boss<M>.webp
//          N = 1-based index into ZONES (1 = Thumama Dunes ... 7 = The Wasta Dimension)
//          M = 1-based boss number within that zone (bosses are every 10th floor), e.g.
//              zone1_boss1 = floor 10, zone1_boss5 = floor 50, zone2_boss1 = floor 60.
//   Size:  512x512, square (1:1). Shown in a fixed square frame with object-fit: cover,
//          so off-square art is cropped, never stretched. Keep the subject centered.
//   Register it by either:
//     - listing it in assets/generated/manifest.json (loaded once at startup), as
//         { "zone1_boss1": "assets/generated/bosses/zone1_boss1.webp", ... }
//       or { "bosses": [{ "id": "zone1_boss1", "path": "..." }] } / a bare array of those
//       ("file"/"src" work for "path"; "zone" + "boss" numbers work for "id"; a bare file
//       name is resolved against assets/generated/bosses/), or
//     - adding the same id -> path entry to BOSS_ART below.
//   A zone with fewer images than bosses cycles through the ones it has (the endless
//   Wasta Dimension relies on this). No image at all -> the zone icon is shown instead.
//
// Regular monsters (and bosses with no zone art) fall back to MONSTER_ART by name.

import { ZONES, MONSTER_NAMES } from './systems/CombatSystem.js';

export const BOSS_ART_DIR = 'assets/generated/bosses/';
export const BOSS_ART_MANIFEST = 'assets/generated/manifest.json';

// Boss art keyed by `zone<N>_boss<M>`; the manifest adds to this at startup
export const BOSS_ART = {};

export const MONSTER_ART = {
  'Drifting Camry': 'drifting_camry.webp',
  'Giant Kabsa Monster': 'giant_kabsa.webp',
  'Angry Shayeb': 'angry_shayeb.webp'
};

const BOSS_ID_RE = /^zone(\d+)_boss(\d+)$/;
const BOSS_PREFIX = '⚡ BOSS: ';

export function bossArtId(zone, boss) {
  return `zone${zone}_boss${boss}`;
}

// { zone, boss } (both 1-based) for a boss floor, or null for a regular floor
export function bossSlot(floor) {
  if (floor < 10 || floor % 10 !== 0) return null;
  let zi = ZONES.findIndex(z => floor >= z.minFloor && floor <= z.maxFloor);
  if (zi < 0) zi = ZONES.length - 1;
  const firstBossFloor = Math.ceil(ZONES[zi].minFloor / 10) * 10;
  return { zone: zi + 1, boss: (floor - firstBossFloor) / 10 + 1 };
}

// Image path for a monster, or null when there is no art (caller shows the fallback icon)
export function resolveMonsterArt(floor, name = '') {
  const slot = bossSlot(floor);
  if (slot) {
    const exact = BOSS_ART[bossArtId(slot.zone, slot.boss)];
    if (exact) return exact;
    const zoneArt = Object.keys(BOSS_ART)
      .map(id => id.match(BOSS_ID_RE))
      .filter(mt => mt && Number(mt[1]) === slot.zone)
      .sort((a, b) => Number(a[2]) - Number(b[2]))
      .map(mt => BOSS_ART[mt[0]]);
    if (zoneArt.length) return zoneArt[(slot.boss - 1) % zoneArt.length];
  }
  const base = name.startsWith(BOSS_PREFIX) ? name.slice(BOSS_PREFIX.length) : name;
  return MONSTER_ART[base] || null;
}

// Emoji shown while art loads, when it fails, or when there is none
export function fallbackIcon(floor, isBoss) {
  if (!isBoss) return '👾';
  const z = ZONES.find(zz => floor >= zz.minFloor && floor <= zz.maxFloor) || ZONES[ZONES.length - 1];
  return z.icon;
}

// Merge a parsed manifest into BOSS_ART. Returns how many boss entries were added.
export function registerBossArt(manifest) {
  if (!manifest || typeof manifest !== 'object') return 0;
  const entries = Array.isArray(manifest) ? manifest
    : Array.isArray(manifest.bosses) ? manifest.bosses
    : Object.entries(manifest).map(([id, path]) => ({ id, path }));
  let added = 0;
  for (const e of entries) {
    if (!e || typeof e !== 'object') continue;
    let path = e.path || e.file || e.src;
    if (typeof path !== 'string' || !path) continue;
    if (!path.includes('/')) path = BOSS_ART_DIR + path;
    let id = e.id;
    if (!id && e.zone && e.boss) id = bossArtId(e.zone, e.boss);
    if (!id) id = path.split('/').pop().replace(/\.[^.]+$/, '');
    if (!BOSS_ID_RE.test(id)) continue;
    BOSS_ART[id] = path;
    added++;
  }
  return added;
}

export async function loadBossArtManifest(url = BOSS_ART_MANIFEST) {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return 0;
    return registerBossArt(await res.json());
  } catch {
    return 0; // no manifest yet: hand-placed art + fallback icons only
  }
}

// Owns the avatar frame's two static children (fallback emoji + <img>). The frame itself
// is never rebuilt, so the card's pointerdown target stays put; per-frame calls are a
// string compare unless the monster changed.
export class MonsterPortrait {
  constructor(frameEl) {
    this.frame = frameEl;
    this.fallbackEl = frameEl.querySelector('.monster-avatar-fallback');
    this.img = frameEl.querySelector('.monster-avatar-img');
    this.key = null;
    this.status = new Map(); // path -> 'loading' | 'ok' | 'error'
    this.pending = new Map(); // path -> Promise<boolean>
  }

  // Warm the browser cache so the swap is instant when that monster arrives
  preload(path) {
    if (!path) return Promise.resolve(false);
    if (this.pending.has(path)) return this.pending.get(path);
    this.status.set(path, 'loading');
    const p = new Promise(resolve => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { this.status.set(path, 'ok'); resolve(true); };
      im.onerror = () => { this.status.set(path, 'error'); resolve(false); };
      im.src = path;
    });
    this.pending.set(path, p);
    return p;
  }

  // Forget the current monster so the next update() re-resolves (e.g. after the manifest loads)
  invalidate() {
    this.key = null;
  }

  update(floor, monster) {
    const key = `${floor}|${monster.artName ?? monster.name}`;
    if (key === this.key) return;
    this.key = key;

    const path = resolveMonsterArt(floor, monster.artName ?? monster.name);
    this.fallbackEl.textContent = fallbackIcon(floor, monster.isBoss);
    this.frame.classList.toggle('is-boss', !!monster.isBoss);

    // Preload the next boss's art while this fight runs
    const nextBoss = (Math.floor(floor / 10) + 1) * 10;
    this.preload(resolveMonsterArt(nextBoss, MONSTER_NAMES[(nextBoss - 1) % MONSTER_NAMES.length]));

    // Zone boss art first, then the by-name portrait if that file is missing
    const named = resolveMonsterArt(0, monster.artName ?? monster.name);
    this.tryArt(key, [path, named !== path ? named : null].filter(Boolean));
  }

  tryArt(key, paths) {
    const path = paths.find(pp => this.status.get(pp) !== 'error');
    if (!path) {
      this.showImage(null);
      return;
    }
    if (this.status.get(path) === 'ok') {
      this.showImage(path);
      return;
    }
    this.showImage(null); // fallback icon while loading
    this.preload(path).then(() => {
      if (this.key === key) this.tryArt(key, paths);
    });
  }

  showImage(path) {
    this.frame.dataset.avatar = path || 'none';
    if (path) {
      if (this.img.getAttribute('src') !== path) this.img.src = path;
      this.frame.classList.add('has-art');
    } else {
      this.frame.classList.remove('has-art');
    }
  }
}
