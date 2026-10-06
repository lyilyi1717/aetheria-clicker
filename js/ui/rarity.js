// Rarity display (docs/ui-style-guide.md §2.4): colour + glyph + word, never colour alone.
// Styles live in css/components.css (.rarity, .gear).

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

/** `<span class="rarity legendary" data-glyph="◆◆◆◆">Legendary</span>`, or '' if unknown. */
export function rarityTag(rarity) {
  const cls = rarityClass(rarity);
  if (!cls) return '';
  const word = cls[0].toUpperCase() + cls.slice(1);
  return `<span class="rarity ${cls}" data-glyph="${RARITY_GLYPHS[cls]}">${word}</span>`;
}

/** One equipped-gear card: slot label, rarity tag, item name and its stat line. */
export function gearCard(slotLabel, item, statText) {
  const cls = rarityClass(item?.rarity);
  return `
    <div class="gear ${cls}">
      <div class="gear-head"><span class="slot">${escapeHtml(slotLabel)}</span>${rarityTag(item?.rarity)}</div>
      <div class="name">${escapeHtml(item?.name || 'Empty')}</div>
      <div class="stat num">${escapeHtml(statText)}</div>
    </div>`;
}
