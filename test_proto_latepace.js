// Dig: the ground past 125 m is a little harder, so the road is not over in a week. Run: node test_proto_latepace.js
import * as G from './proto/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };
const g = G.PARAMS.core.grow;
// the ground down to 125 m (levels 1 to 8) keeps its old numbers
ok(g[0].hp === 1.14 && g[1].hp === 1.17 && g[2].hp === 1.20, 'layers down to 125 m are as before');
// from 125 m the growth is the new table
ok(g[3].hp === 1.196 && g[4].hp === 1.216 && g[5].hp === 1.166, 'the deep layers grow a little faster');
ok(g.slice(6).every(e => e.hp === 1.181), 'the last layers grow x1.181 a metre');
if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('test_proto_latepace: ok');
