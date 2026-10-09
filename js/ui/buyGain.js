// R51: yield gain on each generator buy button, plus the "Best value" badge.
// Pure string helpers; the render loop (main.js updateBuildingsUI) calls them and setText's the result.
import { t } from '../i18n/index.js';
import { tipHtml } from './tooltip.js';

/** Gain line for the button, e.g. "+45/s". */
export function gainLabel(gain) {
  return t('bld.gain', { n: gain.format('standard', 1) });
}

/** data-tip HTML: "+X/s for 💎 Y (Z/s per 💎 1k)". */
export function gainTip(gain, cost) {
  const per1k = cost.gt(0) ? gain.mul(1000).div(cost) : gain;
  return tipHtml(t('bld.gain_tip_title'), t('bld.gain_tip', {
    gain: gain.format('standard', 1), cost: cost.format('standard', 1), per: per1k.format('standard', 2)
  }));
}
