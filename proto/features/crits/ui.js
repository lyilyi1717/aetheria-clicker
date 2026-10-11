// Dig feature (page side): icons of the two big-hit relics. (The big hit's own flash and sound are in the page core.)
import { ui } from '../../ui/app.js';
import { S, badge, star } from '../../ui/icons.js';

ui({
  id: 'crits',
  icons: {
    lucky: badge('#2f8f5b', star(16, 16, 12, 5, 4, '#fff')),
    heavy: badge('#5b4a8a', `<rect x="8" y="7" width="16" height="10" rx="2" fill="#cfd8dc" ${S}/><rect x="14" y="17" width="4" height="10" rx="1" fill="#a8672c" ${S}/>`),
  },
});
