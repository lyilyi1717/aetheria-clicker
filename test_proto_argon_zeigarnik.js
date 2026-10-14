// Unit test for ARGON-14: The Zeigarnik Anchor Hook (Meaningful Session Wrap)
// Run: node test_proto_zeigarnik.js
import * as G from './digger-argon/game.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL: ' + msg); } };

console.log('Testing ARGON-14: The Zeigarnik Anchor Hook...');

// 1. Initial State verification
const s = G.newState();
s.stars = 0;

// Test getZeigarnikAnchor
const data = G.getZeigarnikAnchor(s);
ok(data, 'getZeigarnikAnchor returns data object');
ok(data.museum, 'museum data present');
ok(typeof data.museum.missing === 'number', 'museum missing count is a number');
ok(data.star, 'star step data present');
ok(typeof data.star.needed === 'number', 'star needed count is a number');
ok(data.gate, 'gate data present');
ok(typeof data.gate.level === 'number', 'gate level is a number');

// 2. Closest Museum Set calculation
// Collect 3 pieces of Camel set (Camel has 4 pieces) -> 1 piece missing
s.wingGot['camel.0'] = 1;
s.wingGot['camel.1'] = 1;
s.wingGot['camel.2'] = 1;
delete s.wingGot['camel.3'];
// Collect 1 piece of Whale (Whale has 5 pieces) -> 4 pieces missing
s.wingGot['whale.0'] = 1;

const anchor1 = G.getZeigarnikAnchor(s);
ok(anchor1.museum.set === 'camel', 'correctly identifies camel as the closest set');
ok(anchor1.museum.missing === 1, 'correctly calculates 1 bone missing for camel');

// 3. Cheapest affordable Alqahwa Star step calculation
// Initial steps: pick=0 (cost 2), camp=0 (cost 2), bag=0 (cost 2)
ok(anchor1.star.needed === 2, 'cheapest Star step initially costs 2 Stars');

// Give 10 Stars and advance Pick track to step 12 (Steel Pick)
s.starUp.tr_pick = 12; // Steel Pick step, next step 13 costs: 2 * 1.5^13 ~ 389 Stars
s.starUp.tr_camp = 0;  // Camp next step costs 2 Stars
s.stars = 0;
const anchor2 = G.getZeigarnikAnchor(s);
ok(anchor2.star.track === 'camp' || anchor2.star.track === 'bag', 'identifies cheapest affordable Star step across tracks');
ok(anchor2.star.needed === 2, 'identifies 2 Stars needed for cheapest track');

// Now if camp and bag are high, and pick needs 14 Stars
s.starUp.tr_camp = 20;
s.starUp.tr_bag = 20;
s.starUp.tr_pick = 5; // step 5 costs starStepCost(5) = 15 Stars
s.stars = 1; // 15 - 1 = 14 Stars needed
const anchor3 = G.getZeigarnikAnchor(s);
ok(anchor3.star.track === 'pick', 'identifies Pick as nearest step');
ok(anchor3.star.needed === 14, 'correctly calculates 14 Stars needed');

// 4. Gate distance calculation
s.run = { site: 'bones', floor: 125, level: 7, ch: 1 };
s.best = 100;
const anchor4 = G.getZeigarnikAnchor(s);
ok(anchor4.gate.level === 7, 'identifies Level 7 Gate');
ok(anchor4.gate.depthRemaining === 25, 'calculates 25m depth remaining to Gate');

// 5. Bilingual Formatting Parity
// English format
G.setLang('en');
const enText = G.formatZeigarnikAnchor(s);
console.log('EN Anchor:', enText);
ok(enText.startsWith('Almost there:'), 'EN text starts with Almost there:');
ok(enText.includes('1 bone to complete Camel'), 'EN text includes 1 bone to complete Camel');
ok(enText.includes('14 Stars to'), 'EN text includes 14 Stars to');
ok(enText.includes('Level 7 Gate waiting'), 'EN text includes Level 7 Gate waiting');

// Arabic format
G.setLang('ar');
const arText = G.formatZeigarnikAnchor(s);
console.log('AR Anchor:', arText);
const cleanAr = arText.replace(/[\u2066-\u2069]/g, '');
ok(cleanAr.startsWith('اقتربت من الهدف:'), 'AR text starts with اقتربت من الهدف:');
ok(cleanAr.includes('عظمة واحدة لإكمال Camel'), 'AR text includes Arabic bone phrase');
ok(cleanAr.includes('14 نجمة لـ'), 'AR text includes Arabic star phrase');
ok(cleanAr.includes('بوابة المستوى 7 بانتظارك'), 'AR text includes Arabic gate waiting phrase');

// Reset language back to en
G.setLang('en');

if (failed) {
  console.error(`FAIL: ${failed} check(s) failed in test_proto_zeigarnik.js`);
  process.exit(1);
}
console.log('test_proto_zeigarnik: ok');
