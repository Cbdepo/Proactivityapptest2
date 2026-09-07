# Momentum

A mobile app that turns getting things done into a game — built around the
reward mechanics that make games hard to put down, pointed at your own to-do
list instead of a fictional one.

Built with **Expo / React Native** (TypeScript). Runs on iOS and Android, and in
a browser for quick previewing.

---

## How it works

Five mechanics, each doing a specific job.

### 1. Immediate, oversized payouts

Every completion fires inside the same frame: a haptic pattern, a confetti
burst, and an XP number that lands larger than it needs to. The gap between
"did the thing" and "felt good about the thing" is where motivation leaks
away, so the app closes it to roughly zero.

Quests are priced by size:

| Difficulty | Roughly | XP | Coins | Crate chance |
|---|---|---|---|---|
| Spark | under 2 min | 10 | 5 | 12% |
| Small | ~10 min | 25 | 12 | 20% |
| Standard | ~30 min | 60 | 30 | 32% |
| Epic | an hour+ | 140 | 70 | 55% |
| Boss | the thing you're avoiding | 300 | 160 | **100%** |

### 2. Momentum — the anti-procrastination mechanic

Finishing something spikes a **momentum** meter, which multiplies every payout
up to **2×** — and halves every six hours. The bar visibly drains while you sit
there, which turns "later" into something with a price tag on it. Chaining three
tasks in an afternoon is worth dramatically more than the same three spread
across a week, and the app shows you that in live numbers on each quest card.

### 3. Variable-ratio loot

Fixed rewards stop registering the moment they become predictable. Random ones
don't — it's the schedule slot machines run on. So completions roll for **loot
crates**, and each crate rolls the drop table: mostly small coin piles, rarely
an Overdrive or a Jackpot. Odds are published in-app, on the Loot tab. Hitting
your daily goal always grants one crate, so a slow day still ends in something.

### 4. Streaks with a safety net

Consecutive active days add up to **+50%** on payouts. Streaks that lapse
actually expire — a streak you can't lose isn't worth protecting. But **Streak
Shields** (dropped by rarer crates) auto-spend to absorb a single missed day, so
one bad Tuesday doesn't undo six weeks and make you quit.

### 5. Coins that buy real things

XP is pride; coins are leverage. The **reward shop** holds things you actually
want — an episode of something, an evening off, the thing in your cart — priced
in coins you earned. You define them yourself. This is what stops the currency
from being pretend: the loop has to terminate in something real or it stops
working after a fortnight.

### Plus: Spark, for when you can't start

Procrastination is rarely about the whole task — it's about beginning it. The
**Spark** tab is a 2 / 5 / 10 / 25-minute timer that pays out for *sitting
through the timer*, not for finishing the task. The bribe is attached to the
part that actually needs bribing. Most of the time you keep going past the bell.

---

## Screens

| Tab | What's there |
|---|---|
| **Quests** | Today's board, daily goal, tap-to-complete, add your own |
| **Spark** | Momentum meter, the starter timer, quest to point it at |
| **Loot** | Unopened crates, drop odds, the reward shop |
| **Hero** | Level, five attributes, 16 achievements, activity log, settings |

Progress is stored on-device (AsyncStorage). No account, no server, no network
calls — nothing about your task list leaves the phone.

---

## Running it

```bash
npm install
npm start          # then scan the QR code with Expo Go
```

Or target a platform directly:

```bash
npm run ios        # iOS simulator (macOS)
npm run android    # Android emulator or device
npm run web        # browser, for a quick look
```

Checks:

```bash
npm test           # jest — game maths and state transitions
npm run typecheck  # tsc --noEmit
```

---

## Layout

```
App.tsx                    Shell: HUD + tab switcher + reward overlay
src/
  theme.ts                 Colours, spacing, type scale
  types.ts                 Domain types
  game/
    engine.ts              Levels, momentum decay, streaks, payout maths
    loot.ts                Weighted drop table
    achievements.ts        16 achievements and their progress functions
    seed.ts                First-launch board and shop
  store/
    actions.ts             Pure state transitions (all the rules live here)
    GameProvider.tsx       React context, debounced persistence
    persistence.ts         AsyncStorage read/write, forward-compatible loading
  ui/                      Primitives, HUD, tab bar, confetti, reward overlay
  screens/                 Quests, Spark, Loot, Hero, and two input sheets
```

Every game rule is a pure function in `src/game/` or `src/store/actions.ts`,
which is why the maths is testable without mounting a single component. Tune the
economy by editing `DIFFICULTIES` in `engine.ts` and the `TABLE` in `loot.ts` —
nothing else needs to change.

---

## A note on the design

The mechanics here are the same ones used to make games and slot machines
difficult to walk away from. Pointed at chores, that's useful. Pointed at
itself, it isn't — so the app deliberately has no notifications nagging you
back, no infinite scroll, and no way to earn anything by opening it and doing
nothing. The only thing that generates rewards is finishing something real.

Set your daily goal low enough that you clear it on a bad day. The streak is
worth more than any single session.
