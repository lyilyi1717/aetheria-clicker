// per road level: real day finished, attended minutes, digs started on it before the finish, other digs since the last level
const all = require(require('path').resolve(process.argv[2]));
const ROAD = ['dunes:50','boom:50','bones:75','gold:75'].concat(...[100,150,200,250].map(d=>['dunes:'+d,'boom:'+d,'bones:'+(d+25),'gold:'+(d+25)]));
for (const d of all) {
  const out = []; let prevR = 0;
  ROAD.forEach((k, i) => {
    const f = d.fin.find(x => x.key === k && x.first);
    if (!f) { out.push(`L${i + 1} never`); return; }
    const tries = d.resets.filter(x => x.key === k && x.r <= f.r).length + (i === 0 ? 1 : 0);
    const between = d.resets.filter(x => x.r > prevR && x.r <= f.r).length;
    out.push(`L${i + 1} d${(f.r / 86400).toFixed(1)} ${(f.a / 60).toFixed(0)}m tries${tries} digs${between}`);
    prevR = f.r;
  });
  const after = d.resets.filter(x => x.r > prevR).length;
  console.log(d.player, 'seed', d.seed, '|', out.join(' | '), '| digs after the road', after);
}
