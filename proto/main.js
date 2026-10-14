// Dig: the page's entry. The rules (core + features), the page host, the features' page side, go.
import { LANG } from './core/lang.js';
import { setLang } from './core/strings.js';
setLang(LANG); // before any feature registers or renders
import './game.js';
import { start } from './ui/app.js';
import './features/ui.js';

start();
