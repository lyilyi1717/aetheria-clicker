// Dig feature (page side): the look. Layer colours, site skies, strata and the depth ruler are drawn by
// ui/render.js through world.js and palette.js. This file adds the arrival banner: when a level starts it says
// which level of the road, which place and where the Gate is. Read-only: it never changes the state.
import * as G from '../../game.js';
import { ui } from '../../ui/app.js';
import strings from './strings.js';

const { t } = G;
G.addStrings(strings, 'look');
let due = 0;

function arrive(app) {
  const s = app.state, r = s.run;
  if (!r) return;
  const i = (G.ROAD || []).findIndex(f => f.site === r.site && f.floor === r.floor);
  const place = G.hasString('site_' + r.site) ? t('site_' + r.site) : r.site;
  const zone = i >= 0 ? G.ROAD[i].zone : '';
  const inZone = G.ROAD.filter(f => f.zone === zone);
  const title = i >= 0 && !r.twist ? t('look_arrive_zone', { zone: t('look_zone_' + zone), n: G.ROAD.slice(0, i + 1).filter(f => f.zone === zone).length, of: inZone.length }) : t('look_arrive_title_side', { place });
  app.banner(title, i >= 0 && !r.twist ? t('look_arrive_sub_place', { place, m: r.floor }) : t('look_arrive_sub', { m: r.floor }));
}

ui({
  id: 'look',
  tick(s, app) {
    if (due && performance.now() > due && !app.modal.id) { due = 0; arrive(app); }
  },
  on: {
    // the Stars banner of the finished site shows first (3.6 s); the arrival follows it
    newSite() { due = performance.now() + 3800; },
  },
});
