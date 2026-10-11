// Dig feature (page side): icons of the hit relics.
import { ui } from '../../ui/app.js';
import { S, badge, star } from '../../ui/icons.js';

ui({
  id: 'relics',
  icons: {
    boom: badge('#c0392b', star(16, 16, 12, 5.5, 8, '#ffe14a')),
    deep: badge('#3b6ea8', `<path d="M16 27 L7 16 H12 V5 H20 V16 H25 Z" fill="#fff" ${S}/>`),
    wide: badge('#3b6ea8', `<path d="M3 16 L11 8 V13 H21 V8 L29 16 L21 24 V19 H11 V24 Z" fill="#fff" ${S}/>`),
    echo: badge('#5b4a8a', `<path d="M10 9 Q17 16 10 23 M16 6 Q26 16 16 26" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="7" cy="16" r="2.4" fill="#fff"/>`),
  },
});
