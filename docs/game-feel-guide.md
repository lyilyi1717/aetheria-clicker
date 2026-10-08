# Aetheria game-feel guide ("juice")

**Status:** design guideline, written 2026-10-07. This guide sits next to
`docs/ui-style-guide.md`, which covers how things look. This guide covers how things
**feel when they happen**. Every new reward, ability, purchase or milestone is checked against
it before it is accepted (see §7).

**One-line rule:** *the moment comes first and the number comes second.* When something good
happens, the player should feel it in their eyes, ears and hands before they read the score.
The number still matters. It matters later, when the player plans, compares or races a timer.

---

## 1. What we are talking about

Think of the colour bomb in Candy Crush. You swap two colour bombs and the whole board clears in
a shockwave. Candies fly, the sound rises, and a voice says "Divine!". For that second, nobody
looks at the score. It just *felt good*. The score only matters near the end, when the move
counter or the timer runs out and you check whether you hit the target.

The game industry has names for this:

| Term | Meaning | Source |
|---|---|---|
| **Game feel** | The tactile quality of how a game responds to input. It has three parts: *responsiveness* (short delay from input to feedback), *intuitiveness* (the result is the one you meant) and *viscerality* (it feels physical). | Steve Swink, *Game Feel* (2008) |
| **Juice** | Extra feedback that the rules don't need: shake, squash, particles, sound, flashes. It makes an action feel alive. | Jonasson & Purho, "Juice It or Lose It", GDC Europe 2012 |
| **Feedback loop / reinforcement** | An action is followed right away by a response the player likes, so they want to do it again. | Operant conditioning (Skinner); game-design usage everywhere |
| **Reward prediction error** | Dopamine responds most to a reward that is *better than expected*. A reward that is exactly as expected feels flat. A reward that is worse than expected feels like a loss. | Schultz et al.; reviewed in Linnet 2014, *Frontiers in Behavioral Neuroscience* |
| **Anticipation** | The brain responds *before* the reward (the wind-up), not only when it arrives. A short build-up makes the payoff bigger. | Same literature (reward anticipation vs. outcome evaluation) |
| **Peak-end rule** | People remember an experience by its strongest moment and its end, not by the average. | Kahneman |

So the "instant feedback" in the request is **game feel**. The satisfying burst itself is
**juice**, and the psychology underneath is **reinforcement plus reward prediction error**.

## 2. Why it works (the psychology, briefly)

1. **Immediacy ties cause to effect.** Feedback in the first ~100 ms reads as "I did that".
   After ~250 ms it reads as "the game did something". Ownership is what makes it satisfying.
2. **More senses make it louder.** Sight, sound and motion that agree with each other are felt
   as one strong event. A sound alone or a particle alone is weak.
3. **Surprise beats size.** A big reward the player expected feels flatter than a mid-sized one
   they didn't. This is reward prediction error. Rarer events need *distinct* feedback, not just
   bigger numbers.
4. **Build-up, then release.** A short wind-up (charge, rising pitch, a hit-stop before an
   explosion) sets up the payoff. Without it a big moment can feel like noise.
5. **Escalation over a chain.** Each step of a combo or cascade should be a little more intense
   than the last (higher pitch, more particles, bigger text). The player's excitement climbs with
   it.
6. **The peak is what's remembered.** One great moment per session does more for "I want to come
   back" than many average ones.

## 3. How other games do it

| Game | Moment | What they do | What we take from it |
|---|---|---|---|
| **Candy Crush** | Special candy and colour-bomb combos | Each special has its own look and sound. Combos get bigger, unique effects (cross blast, board wipe). Voice callouts ("Sweet", "Delicious", "Divine") rise with the size of the cascade. At level end, "Sugar Crush" sets off the leftover moves as a free fireworks show. | Rare = *different*, not only bigger. Name the moment out loud. The end-of-round celebration happens *after* the score is settled and costs the player nothing. |
| **Peggle** | Hitting the last orange peg | Slow motion and a zoom as the ball nears the last peg (build-up), then "Ode to Joy", a rainbow and fireworks. | Hit-stop / slow-down before the payoff. One rare, huge, memorable peak. |
| **Balatro** | Scoring a hand | Cards trigger one at a time. Each one plays a note **a step higher** than the last. Chips and mult tick up like a slot reel. Screen shake scales with the score. When the total beats the blind, the score bar catches fire. | Count step by step instead of jumping to the result. Rising pitch over a chain. Intensity scales with how big the moment is. |
| **Cookie Clicker** | The click and the Golden Cookie | Every click: the cookie squashes, a "+n" floats up, crumbs fall. The Golden Cookie is rare, appears at a random spot, has its own sound and a big buff banner. | The base click should be tactile and cheap. Rare, short-lived events get their own look. |
| **Vampire Survivors** | Opening a chest | A drum roll and a slot-reel reveal with light beams and music. The reward is shown *before* you choose. | Turn the reward reveal into a short show. Keep it skippable. |
| **Diablo / loot games** | Rare item drops | Colour and a beam of light by rarity, plus a unique sound per tier, so the player knows the tier before reading. | Rarity is read through colour and sound first (we already have rarity colours, `docs/ui-style-guide.md` §2.4). |
| **Hades / action games** | Heavy hits | Hit-stop (freeze a few frames), a flash and a small shake. | A few frames of freeze make a hit feel heavy. Cheap to build. |

## 4. The principles (our rules)

**P1. Respond inside 100 ms.** Every click or tap gives visible *and* audible feedback in the
same frame. No action is ever silent and still.

**P2. Feedback scales with significance.** Set up tiers and use them everywhere:

| Tier | Example | Budget |
|---|---|---|
| T0 tap | Monolith click, buying 1 upgrade | Small squash, small sound, floating number. < 200 ms. |
| T1 good | Crit, a gem found, a contract done | Its own sound and colour, more particles, a short text pop. < 500 ms. |
| T2 great | Boss down, rare drop, a combo tier | Hit-stop or build-up, a distinct sound, shake (if motion is on), a banner. 0.5–1.5 s. |
| T3 peak | Ascension, prestige, the first time something unlocks | A ceremony: build-up, release, a named callout. Skippable. 1.5–4 s. |

Don't spend a higher tier on a lower event. If everything shakes, nothing does.

**P3. Rare = different, not just bigger.** Each T2/T3 event gets its own sound and its own
visual signature, so the player knows what happened without reading.

**P4. Build up, then release.** Give T2/T3 a short wind-up: a rising tone, a charge, a
50–120 ms hit-stop before the burst.

**P5. Escalate chains.** Repeated or chained events (combo, crit streak, auto-blast cascade,
multi-buy) raise pitch, particle count or text size step by step, up to a cap. Reset gently.

**P6. Count up, don't jump.** Big gains roll up from the old value to the new one (with a
time cap), so the player sees the gain happen. Under reduced motion, jump straight to the
result.

**P7. The moment first, the number second.** During the moment, show the feeling (effect +
short label: "CRIT!", "Boss down!"). Put the exact number where it can be read afterwards
(tooltips, logs, the summary at the end of a round). When there is a timer or a target, the
number becomes the main thing: make progress-to-target obvious as the clock runs down.

**P8. Celebrate the end.** End of a round, a boss, an offline return or a prestige gets a
closing celebration (peak-end rule). It never takes anything away and can always be skipped.

**P9. Juice must not hide information.** Effects never cover a button the player needs, never
block input for more than the ceremony limit, and never move the layout.

## 5. Guardrails (honest juice)

This guide works together with AGENTS.md rule 8 ("No dark patterns").

- **No losses disguised as wins.** Slot machines celebrate a "win" that pays less than the bet,
  and research shows players then misjudge how much they are actually winning. We celebrate
  only real gains. A result worse than the cost (a failed craft, a refund) never gets win
  feedback.
- **No near-miss baiting.** Don't fake "so close!" outcomes to push another try.
- **No celebration tied to spending to skip.** We don't have paid skips. Keep it that way.
- **Respect reduced motion.** Under `data-motion="reduced"` (see `js/ui/motion.js` and
  `docs/ui-style-guide.md` §6): no shake, no flashes, short ceremonies, no count-up. Keep the
  sound and the colour change, so the moment still lands.
- **Respect sound settings.** Mute and volume always win.
- **Flashes:** no more than 3 full-screen flashes per second (photosensitivity).
- **Don't wear people out.** Repeated T0 feedback stays small. Give a T1+ sound a short cooldown
  or a gentle variation so it doesn't grate during long idle sessions.
- **Performance:** cap particles. Effects must not drop frames at phone width on a mid-range
  phone.

## 6. Tools we already have

- `js/engine/ParticleEngine.js`: `spawnClickSparks`, `spawnFloatingText` (has `isCrit`).
- `js/engine/AudioEngine.js`: `playClick(pitchMod)`, `playCrit`, `playHit`, `playDefeat`,
  `playGem`, `playAchievement`, `playAscension`, `playTier(tier)`, scale-based
  `getNextFreq()` (good for rising chains, P5).
- `js/ui/motion.js`: `isReducedMotion()`. Check it before any shake, flash or count-up.
- `js/ui/rewards.js`, `js/ui/rewardQueue.js`, `js/ui/comboBar.js`: reward display, queueing and
  the combo bar.
- `docs/ui-style-guide.md` §2.4 (rarity colours) and §6 (motion).

Reuse these before adding new effect code. A shared "feedback tier" helper (T0–T3 from §4 P2)
would keep the game consistent. See `docs/game-feel-opportunities.md` once it exists.

## 7. Acceptance checklist (for any feature with a reward or an action)

Add this to the PR for any change that adds or changes a player action, reward, drop, milestone
or ceremony:

- [ ] Which tier is it (T0–T3)? Does the feedback match the tier (§4 P2)?
- [ ] Feedback starts in the same frame as the input (P1).
- [ ] At least two senses agree (e.g. sound + visual) for T1 and above.
- [ ] Rare events have their own sound/visual, not just bigger numbers (P3).
- [ ] Chains escalate and are capped (P5), if the event can repeat quickly.
- [ ] The exact number can be read afterwards (P7).
- [ ] Honest: no win feedback on a net loss, no fake near-misses (§5).
- [ ] Reduced motion: no shake/flash/count-up, the moment still reads (§5).
- [ ] Checked at ~375 px wide: effects don't cover controls or shift the layout (P9).
- [ ] Ceremonies (T3) can be skipped.

## 8. Sources

- Steve Swink, *Game Feel: A Game Designer's Guide to Virtual Sensation* (2008).
- Martin Jonasson & Petri Purho, "Juice It or Lose It", GDC Europe 2012.
- Jan Willem Nijman (Vlambeer), "The Art of Screenshake" (2013 talk).
- Linnet, J. (2014). "Neurobiological underpinnings of reward anticipation and outcome
  evaluation in gambling disorder." *Frontiers in Behavioral Neuroscience* 8:100.
  https://www.frontiersin.org/articles/10.3389/fnbeh.2014.00100/full
- Dixon, M. J. et al. Research on "losses disguised as wins" in multiline slot machines, e.g.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC5663799/
- Balatro feedback breakdown: https://blakecrosley.com/guides/design/balatro
- Game feel & juice course notes: https://mycours.es/egd/game-feel-game-juice/
- On over-juicing: https://www.wayline.io/blog/juice-overload-sensory-feedback-hurts-gameplay
- Kahneman, D. et al. (1993), peak-end rule.
