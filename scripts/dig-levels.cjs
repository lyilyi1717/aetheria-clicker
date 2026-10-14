// per road level: real day finished, attended minutes, digs started on it before the finish, other digs since the last level.
// Usage: node scripts/dig-levels.cjs <dump.json> [--gates]
//   --gates  one more line per seed: the Gate in swings at arrival per level (hp / (your hit + 4 Rafeeqs' damage per swing at 3
//            swings a second), from dump.gates, the first fight at each Gate), the measure in docs/pacing-targets.md "Felt power";
//            and a line with the winning Gate fight in attended seconds (your first hit to the finish; "-" = you never hit it).
//            The estimate uses the pick at your first hit and leaves out TNT, tools and the Gate's memory, so in chapter two,
//            where those break a Gate the player cannot hurt, the fight seconds are the number to compare.
// The road is 40 levels: chapter one (keys `dunes:100`) and chapter two (keys `c2:dunes:100`, docs/dig-design.md 2.4).
const all = require(require('path').resolve(process.argv[2]));
const GATES = process.argv.includes('--gates');
const CH1 = ['dunes:50','boom:50','bones:75','gold:75'].concat(...[100,150,200,250].map(d=>['dunes:'+d,'boom:'+d,'bones:'+(d+25),'gold:'+(d+25)]));
const CH2 = [].concat(...[100,150,200,250,300].map(d=>['c2:dunes:'+d,'c2:boom:'+d,'c2:bones:'+(d+25),'c2:gold:'+(d+25)]));
const ROAD = CH1.concat(CH2);
const fmt = x => x >= 1e9 ? (x / 1e9).toFixed(1) + 'G' : x >= 1e6 ? (x / 1e6).toFixed(1) + 'M' : x >= 1e3 ? (x / 1e3).toFixed(1) + 'k' : x.toFixed(0);
for (const d of all) {
  const out = [], sw = [], fi = []; let prevR = 0;
  ROAD.forEach((k, i) => {
    const g = (d.gates || []).find(x => x.key === k);
    sw.push(`L${i + 1} ${g ? fmt(g.max / (g.pick + 4 * g.crew / 3)) : '-'}`);
    const w = (d.gates || []).find(x => x.key === k && x.fight !== undefined);
    fi.push(`L${i + 1} ${w ? w.fight.toFixed(0) + 's' : '-'}`);
    const f = d.fin.find(x => x.key === k && x.first);
    if (!f) { out.push(`L${i + 1} never`); return; }
    const tries = d.resets.filter(x => x.key === k && x.r <= f.r).length + (i === 0 ? 1 : 0);
    const between = d.resets.filter(x => x.r > prevR && x.r <= f.r).length;
    out.push(`L${i + 1} d${(f.r / 86400).toFixed(1)} ${(f.a / 60).toFixed(0)}m tries${tries} digs${between}`);
    prevR = f.r;
  });
  const after = d.resets.filter(x => x.r > prevR).length;
  console.log(d.player, 'seed', d.seed, '|', out.join(' | '), '| digs after the road', after);
  if (GATES) console.log(d.player, 'seed', d.seed, 'Gate swings at arrival |', sw.join(' | '));
  if (GATES) console.log(d.player, 'seed', d.seed, 'Gate fight seconds |', fi.join(' | '));
}
