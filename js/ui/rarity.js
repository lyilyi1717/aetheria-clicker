// Rarity display (docs/ui-style-guide.md §2.4): colour + glyph + word, never colour alone.
// Styles live in css/components.css (.rarity, .gear).

import { tipHtml, tipAttr } from './tooltip.js';
import { t, tOr } from '../i18n/index.js';

export const RARITY_GLYPHS = {
  common: '●',
  rare: '●●',
  epic: '●●●',
  legendary: '◆◆◆◆',
  cosmic: '★★★★★'
};

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/** CSS class for a rarity name ('Legendary' -> 'legendary'), or '' if unknown. */
export function rarityClass(rarity) {
  const key = String(rarity || '').toLowerCase();
  return RARITY_GLYPHS[key] ? key : '';
}

/** The rarity word in the player's language ('Legendary' / 'أسطوري'), or '' if unknown. */
export function rarityWord(rarity) {
  const cls = rarityClass(rarity);
  return cls ? t(`rarity.${cls}`) : '';
}

/**
 * Display name of a gear item. Saves store English names: generated drops are "<Rarity> <SLOT>"
 * and the starting kit has fixed names, so both are looked up rather than shown as saved.
 */
export function gearName(item) {
  const name = item?.name;
  if (!name) return t('gear.empty');
  const m = /^(Common|Rare|Epic|Legendary|Cosmic) (WEAPON|ARMOR|AMULET|RELIC)$/.exec(name);
  if (m) return t('gear.generated', { rarity: rarityWord(m[1]), slot: t(`gear.slot.${m[2].toLowerCase()}`) });
  return tOr(`gear.start.${name.toLowerCase().replace(/[^a-z]+/g, '_')}`, name);
}

/** `<span class="rarity legendary" data-glyph="◆◆◆◆">Legendary</span>`, or '' if unknown. */
export function rarityTag(rarity) {
  const cls = rarityClass(rarity);
  if (!cls) return '';
  const word = rarityWord(cls);
  return `<span class="rarity ${cls}" data-glyph="${RARITY_GLYPHS[cls]}">${word}</span>`;
}

/** One equipped-gear card: slot label, rarity tag, item name and its stat line. */
export function gearCard(slotLabel, item, statText, slotKey = '') {
  const cls = rarityClass(item?.rarity);
  const word = rarityWord(item?.rarity);
  const tip = item
    ? tipHtml(gearName(item), [slotLabel, word].filter(Boolean).join(' · '), statText,
      t('gear.tip.replace'))
    : tipHtml(t('gear.tip.empty_slot', { slot: slotLabel }), t('gear.tip.find'));
  const artImg = (slotKey && item?.rarity)
    ? `<img class="gear-art" src="assets/generated/gear/${slotKey.toLowerCase()}_${String(item.rarity).toLowerCase()}.webp" alt="${escapeHtml(slotLabel)}" loading="lazy">`
    : '';
  return `
    <div class="gear ${cls}" ${tipAttr(tip)}>
      ${artImg}
      <div class="gear-info">
        <div class="gear-head"><span class="slot">${escapeHtml(slotLabel)}</span>${rarityTag(item?.rarity)}</div>
        <div class="name">${escapeHtml(gearName(item))}</div>
        <div class="stat num">${escapeHtml(statText)}</div>
      </div>
    </div>`;
}
