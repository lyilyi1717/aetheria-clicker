// Rafeeq lines by trait and moment: "chat_<trait>_<moment>_n" is the count, "_<k>" the lines. Five words at most, whole lines.
// Pairs: "chat_pair_<k>_a" is said first and "_b" is the answer ({name} is the mate's name).
const L = (trait, o) => Object.fromEntries(Object.entries(o).flatMap(([m, a]) => [[`chat_${trait}_${m}_n`, a.length], ...a.map((x, k) => [`chat_${trait}_${m}_${k}`, x])]));
import { NICK_LINES, BOSS_TRAIT, BOSS_ALL, BOSS_TEA, BOSS_WAKE, BOSS_BACK } from './nicklines.js';
import { BOSS_TIME } from './timelines.js';
import { BOSSF_TRAIT, BOSSF_ALL, BOSSF_TEA, BOSSF_WAKE, BOSSF_BACK, BOSSF_TIME } from './nicklines.js';
const list = (key, a) => [[`${key}_n`, a.length], ...a.map((x, k) => [`${key}_${k}`, x])];
const BOSSF = Object.fromEntries([...Object.entries(BOSSF_TRAIT).flatMap(([tr, a]) => list('bossf_' + tr, a)), ...list('bossf_all', BOSSF_ALL), ...list('bossf_tea', BOSSF_TEA), ...list('bossf_wake', BOSSF_WAKE), ...list('bossf_back', BOSSF_BACK), ...Object.entries(BOSSF_TIME).flatMap(([m, a]) => list('bossf_time_' + m, a))]);
const NICKS = Object.fromEntries(Object.entries(NICK_LINES).flatMap(([id, o]) => [...list('nk_say_' + id, o.say), ['nk_boss_' + id, o.boss]]));
const BOSS = Object.fromEntries([...Object.entries(BOSS_TRAIT).flatMap(([tr, a]) => list('boss_' + tr, a)), ...list('boss_all', BOSS_ALL), ...list('boss_tea', BOSS_TEA), ...list('boss_wake', BOSS_WAKE), ...list('boss_back', BOSS_BACK), ...Object.entries(BOSS_TIME).flatMap(([m, a]) => list('boss_time_' + m, a))]);
export default { en: {
  ...NICKS, ...BOSS, ...BOSSF,
  bossf_name: 'almodeera',
  boss_name: 'almodeer',
  ...L('eager', {
    hired: ['Me first!', 'Where do I dig?'], ore: ['Again, again!', 'More, more!'], tnt: ['Light it!', 'Boom time!'],
    rock: ['Let me at it!', 'I will hit it first!'], land: ['New sand! Yalla!', 'Where to now?'], finish: ['One more level!', 'Again! Again!'],
    patted: ['Wallah, thanks!', 'Yalla! Yalla!'], deep: ['So dark! I love it!', 'Down we go!'], cheer: ['Yalla!', 'Yalla, Rafeeqs!'],
    five: ['Yes! Yes!', 'High five!'], flex: ['Look at me!', 'Beat that!'], stamp: ['Not for long!', 'I am coming!'],
  }),
  ...L('sleepy', {
    hired: ['Is it morning?', 'Five more minutes.'], ore: ['Oh. Shiny.', 'Hm. Nice.'], tnt: ['Wake me after.', 'Too loud...'],
    rock: ['It is so big...', 'Too big to hit.'], land: ['Long walk.', 'Are we there?'], finish: ['Now we nap.', 'Time for sleep.'],
    patted: ['Mmm.', 'Mmm, that is nice.'], deep: ['Cosy down here.', 'Good place to nap.'], cheer: ['Yalla... yawn.', 'Yaaawn. Yalla.'],
    five: ['Mm. Yes.', 'Good, good.'], flex: ['Hm. Nice arms.', 'Oh. I won.'], stamp: ['Later. Nap first.', 'Hmph. Sleepy.'],
  }),
  ...L('joker', {
    hired: ['Who ordered a digger?', 'Have you got tea?'], ore: ['I planted that.', 'I put it there!'], tnt: ['Not my eyebrows!', 'Duck! Or do not.'],
    rock: ['Nice rock. Bad rock.', 'Rock, meet pick.'], land: ['Same sand, new hat.', 'Is this sand salty?'], finish: ['We broke the floor!', 'We broke it. Oops.'],
    patted: ['Careful, I am ticklish.', 'Ha! That tickles!'], deep: ['Who turned off the sun?', 'Spooky. Wooo!'], cheer: ['Yalla, my friends!', 'Hip hip, yalla!'],
    five: ['Up high!', 'Too slow!'], flex: ['They call me Muscles.', 'Pick that up!'], stamp: ['I am only joking.', 'Ha. Next time.'],
  }),
  ...L('careful', {
    hired: ['I brought my own pick.', 'Safety first.'], ore: ['Slowly now...', 'Careful with it.'], tnt: ['Step back, all.', 'Mind the blast.'],
    rock: ['Aim for the crack.', 'Look for the weak spot.'], land: ['Watch your step here.', 'Look before you dig.'], finish: ['All safe. Good.', 'No one is hurt.'],
    patted: ['Mind the hat.', 'Easy, easy.'], deep: ['Watch the dark.', 'Stay together.'], cheer: ['Yalla. Carefully.', 'Yalla, all safe.'],
    five: ['Good. Nicely done.', 'Well done, friend.'], flex: ['Slow and steady wins.', 'Careful pays off.'], stamp: ['I was careful, too.', 'Hm. Not fair.'],
  }),
  ...L('proud', {
    hired: ['The best is here.', 'You chose well.'], ore: ['I knew it was there.', 'As I said.'], tnt: ['I am not scared.', 'Just a little bang.'],
    rock: ['It should fear me.', 'I have beaten bigger.'], land: ['They will know my name.', 'A fine place.'], finish: ['Bow to us.', 'Tell the stories.'],
    patted: ['Yes, I know.', 'You may pat again.'], deep: ['A hero goes deep.', 'Even here, I shine.'], cheer: ['Yalla! Admire us!', 'Yalla, the best crew!'],
    five: ['Of course.', 'We are the best.'], flex: ['Behold my pick!', 'Number one!'], stamp: ['I was just warming up.', 'Impossible!'],
  }),
  ...L('hungry', {
    hired: ['Is there lunch?', 'Got any dates?'], ore: ['Looks like candy.', 'Is it edible?'], tnt: ['Smells like toast.', 'Is it dinner?'],
    rock: ['Rock for dinner?', 'Big rock, big plate.'], land: ['What do they eat here?', 'Any kebab nearby?'], finish: ['Now we feast.', 'Time for dinner!'],
    patted: ['Got dates?', 'Thanks! Got snacks?'], deep: ['No food down here.', 'Dark and hungry.'], cheer: ['Yalla! Then lunch!', 'Yalla, and food!'],
    five: ['Yes! Lunch next!', 'Tasty work!'], flex: ['Strong from dates!', 'Dates make muscles.'], stamp: ['Give me a snack.', 'Hungry and angry.'],
  }),
  chat_pair_0_a: 'Tea, {name}?', chat_pair_0_b: 'Always.',
  chat_pair_1_a: 'Race you down!', chat_pair_1_b: 'You go. I watch.',
  chat_pair_2_a: 'Nice hat.', chat_pair_2_b: 'It is new.',
  chat_pair_3_a: 'Was that you?', chat_pair_3_b: 'It was the rock.',
  chat_trait_eager: 'Eager', chat_trait_sleepy: 'Sleepy', chat_trait_joker: 'Joker',
  chat_trait_careful: 'Careful', chat_trait_proud: 'Proud', chat_trait_hungry: 'Hungry',
  chat_tag_line: '{trait}. {n} broken',
  chat_panel: 'Chatter',
  chat_talk_on: 'Rafeeqs talk: on', chat_talk_off: 'Rafeeqs talk: off',
  chat_cheer: 'Cheer (C)',
  chat_cheer_d: 'All Rafeeqs raise their picks and shout Yalla',
  chat_pat_hint: 'Right click a Rafeeq to pat him',
}, ar: {
  boss_name: 'المدير', bossf_name: 'المديرة',
} };
