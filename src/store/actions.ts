import {
  Category,
  Difficulty,
  GameState,
  LogEntry,
  LootDrop,
  Quest,
  Repeat,
  RewardBurst,
  ShopItem,
} from '../types';
import {
  CATEGORIES,
  DIFFICULTIES,
  addMomentum,
  advanceStreak,
  computePayout,
  currentMomentum,
  dayKey,
  decayStreak,
  levelFromXp,
  uid,
} from '../game/engine';
import { Achievement, newlyUnlocked } from '../game/achievements';
import { rollLoot } from '../game/loot';
import { colors, rarityColors } from '../theme';

const LOG_LIMIT = 60;

function log(state: GameState, entry: Omit<LogEntry, 'id' | 'at'>, at: number): GameState {
  const next: LogEntry = { ...entry, id: uid(), at };
  return { ...state, log: [next, ...state.log].slice(0, LOG_LIMIT) };
}

/**
 * Pay out any achievements the current state satisfies. Runs after every
 * mutation that can move a counter, so unlocks land in the same reward burst
 * as the action that earned them rather than a beat later.
 */
function settleAchievements(
  state: GameState,
  at: number,
): { state: GameState; unlocked: Achievement[] } {
  const unlocked = newlyUnlocked(state);
  if (unlocked.length === 0) return { state, unlocked };

  let next = state;
  for (const a of unlocked) {
    next = {
      ...next,
      achievements: { ...next.achievements, [a.id]: at },
      hero: { ...next.hero, coins: next.hero.coins + a.bounty },
    };
    next = log(next, { kind: 'achievement', text: `${a.icon} ${a.label}`, coins: a.bounty }, at);
  }
  return { state: next, unlocked };
}

// ---------------------------------------------------------------------------
// Day rollover
// ---------------------------------------------------------------------------

/**
 * Bring a state loaded from disk (or left open overnight) up to today: reset
 * the daily counter and expire a streak that has actually lapsed. Idempotent.
 */
export function rollDay(state: GameState, now: number = Date.now()): GameState {
  const today = dayKey(now);
  let next = state;
  if (state.daily.day !== today) {
    next = { ...next, daily: { day: today, completed: 0, crateEarned: false } };
  }
  const streak = decayStreak(next.streak, today);
  if (streak !== next.streak) next = { ...next, streak };
  return next;
}

// ---------------------------------------------------------------------------
// Quests
// ---------------------------------------------------------------------------

export function isQuestDoneToday(quest: Quest, today: string): boolean {
  if (quest.archived) return true;
  return quest.lastCompletedDay === today;
}

/** Quests still open on today's board, hardest first so the Boss can't hide. */
export function activeQuests(state: GameState, today: string): Quest[] {
  const order: Difficulty[] = ['boss', 'epic', 'standard', 'small', 'spark'];
  return state.quests
    .filter(q => !isQuestDoneToday(q, today))
    .sort((a, b) => order.indexOf(a.difficulty) - order.indexOf(b.difficulty) || a.createdAt - b.createdAt);
}

export function doneQuests(state: GameState, today: string): Quest[] {
  return state.quests.filter(q => !q.archived && q.lastCompletedDay === today);
}

export function addQuest(
  state: GameState,
  input: { title: string; category: Category; difficulty: Difficulty; repeat: Repeat },
  now: number = Date.now(),
): GameState {
  const quest: Quest = {
    id: uid(),
    title: input.title.trim(),
    category: input.category,
    difficulty: input.difficulty,
    repeat: input.repeat,
    createdAt: now,
    lastCompletedDay: null,
    timesCompleted: 0,
    archived: false,
  };
  return { ...state, quests: [...state.quests, quest] };
}

export function deleteQuest(state: GameState, id: string): GameState {
  return { ...state, quests: state.quests.filter(q => q.id !== id) };
}

/**
 * The centre of the whole app: one tap, one immediate, slightly unpredictable
 * payout. Returns the burst so the UI can slam it on screen in the same frame.
 */
export function completeQuest(
  state: GameState,
  id: string,
  now: number = Date.now(),
): { state: GameState; burst: RewardBurst | null } {
  const rolled = rollDay(state, now);
  const today = dayKey(now);
  const quest = rolled.quests.find(q => q.id === id);
  if (!quest || isQuestDoneToday(quest, today)) return { state: rolled, burst: null };

  const momentum = currentMomentum(rolled.momentum, now);
  const beforeLevel = levelFromXp(rolled.hero.xp);
  const payout = computePayout(quest.difficulty, momentum, rolled.streak.current);

  const { streak, shieldUsed } = advanceStreak(rolled.streak, today);

  let next: GameState = {
    ...rolled,
    hero: {
      xp: rolled.hero.xp + payout.xp,
      coins: rolled.hero.coins + payout.coins,
      attributes: {
        ...rolled.hero.attributes,
        [quest.category]: rolled.hero.attributes[quest.category] + payout.xp,
      },
    },
    momentum: addMomentum(rolled.momentum, payout.momentumGain, now),
    streak,
    quests: rolled.quests.map(q =>
      q.id === id
        ? {
            ...q,
            lastCompletedDay: today,
            timesCompleted: q.timesCompleted + 1,
            archived: q.repeat === 'once',
          }
        : q,
    ),
    daily: { ...rolled.daily, completed: rolled.daily.completed + 1 },
    crates: rolled.crates + (payout.crate ? 1 : 0),
  };

  // Hitting the daily goal is the one guaranteed crate — a fixed anchor under
  // the random drops so a slow day still ends in something.
  let goalCrate = false;
  if (!next.daily.crateEarned && next.daily.completed >= next.settings.dailyGoal) {
    next = { ...next, daily: { ...next.daily, crateEarned: true }, crates: next.crates + 1 };
    goalCrate = true;
  }

  next = log(
    next,
    { kind: 'quest', text: quest.title, xp: payout.xp, coins: payout.coins },
    now,
  );

  const afterLevel = levelFromXp(next.hero.xp);
  if (afterLevel > beforeLevel) {
    next = log(next, { kind: 'level', text: `Reached level ${afterLevel}` }, now);
  }

  const settled = settleAchievements(next, now);
  next = settled.state;

  const subtitleParts: string[] = [];
  if (shieldUsed) subtitleParts.push('🛡 Shield spent — streak saved');
  if (goalCrate) subtitleParts.push('🎁 Daily goal crate');
  else if (payout.crate) subtitleParts.push('🎁 Crate dropped!');
  if (subtitleParts.length === 0) subtitleParts.push(CATEGORIES[quest.category].label + ' +' + payout.xp);

  return {
    state: next,
    burst: {
      title: quest.title,
      subtitle: subtitleParts.join('  ·  '),
      xp: payout.xp,
      coins: payout.coins,
      momentumGain: payout.momentumGain,
      multiplier: payout.multiplier,
      crate: payout.crate || goalCrate,
      levelUp: afterLevel > beforeLevel ? afterLevel : null,
      unlocked: settled.unlocked.map(a => `${a.icon} ${a.label}`),
      accent: DIFFICULTIES[quest.difficulty].color,
    },
  };
}

// ---------------------------------------------------------------------------
// Loot
// ---------------------------------------------------------------------------

export function openCrate(
  state: GameState,
  now: number = Date.now(),
): { state: GameState; drop: LootDrop | null; burst: RewardBurst | null } {
  if (state.crates <= 0) return { state, drop: null, burst: null };

  const drop = rollLoot();
  const beforeLevel = levelFromXp(state.hero.xp);

  let next: GameState = {
    ...state,
    crates: state.crates - 1,
    cratesOpened: state.cratesOpened + 1,
    hero: {
      ...state.hero,
      xp: state.hero.xp + drop.xp,
      coins: state.hero.coins + drop.coins,
    },
    momentum: drop.momentum ? addMomentum(state.momentum, drop.momentum, now) : state.momentum,
    streak: { ...state.streak, shields: state.streak.shields + drop.shields },
  };

  next = log(next, { kind: 'loot', text: drop.label, xp: drop.xp, coins: drop.coins }, now);

  const afterLevel = levelFromXp(next.hero.xp);
  if (afterLevel > beforeLevel) {
    next = log(next, { kind: 'level', text: `Reached level ${afterLevel}` }, now);
  }

  const settled = settleAchievements(next, now);
  next = settled.state;

  return {
    state: next,
    drop,
    burst: {
      title: drop.label,
      subtitle: drop.detail,
      xp: drop.xp,
      coins: drop.coins,
      momentumGain: drop.momentum,
      multiplier: 1,
      crate: false,
      levelUp: afterLevel > beforeLevel ? afterLevel : null,
      unlocked: settled.unlocked.map(a => `${a.icon} ${a.label}`),
      accent: rarityColors[drop.rarity],
    },
  };
}

// ---------------------------------------------------------------------------
// Spark sessions
// ---------------------------------------------------------------------------

/**
 * A finished Spark timer. Deliberately paid on *starting and sitting through*
 * something rather than on finishing it, because the activation energy is the
 * part that actually needs bribing.
 */
export function finishSpark(
  state: GameState,
  minutes: number,
  now: number = Date.now(),
): { state: GameState; burst: RewardBurst } {
  const rolled = rollDay(state, now);
  const today = dayKey(now);
  const beforeLevel = levelFromXp(rolled.hero.xp);

  const xp = Math.round(12 * minutes);
  const coins = Math.round(6 * minutes);
  const momentumGain = Math.min(35, 10 + minutes * 2);
  const { streak } = advanceStreak(rolled.streak, today);

  let next: GameState = {
    ...rolled,
    hero: {
      ...rolled.hero,
      xp: rolled.hero.xp + xp,
      coins: rolled.hero.coins + coins,
      attributes: { ...rolled.hero.attributes, focus: rolled.hero.attributes.focus + xp },
    },
    momentum: addMomentum(rolled.momentum, momentumGain, now),
    streak,
    sparkSessions: rolled.sparkSessions + 1,
    crates: rolled.crates + (Math.random() < 0.25 ? 1 : 0),
  };

  next = log(next, { kind: 'spark', text: `${minutes}-minute Spark`, xp, coins }, now);

  const afterLevel = levelFromXp(next.hero.xp);
  if (afterLevel > beforeLevel) {
    next = log(next, { kind: 'level', text: `Reached level ${afterLevel}` }, now);
  }

  const settled = settleAchievements(next, now);
  next = settled.state;

  return {
    state: next,
    burst: {
      title: 'Spark complete',
      subtitle: `You started. That was the hard part.`,
      xp,
      coins,
      momentumGain,
      multiplier: 1,
      crate: next.crates > rolled.crates,
      levelUp: afterLevel > beforeLevel ? afterLevel : null,
      unlocked: settled.unlocked.map(a => `${a.icon} ${a.label}`),
      accent: colors.flame,
    },
  };
}

// ---------------------------------------------------------------------------
// Shop — where coins turn back into real life
// ---------------------------------------------------------------------------

export function addShopItem(state: GameState, label: string, cost: number): GameState {
  const item: ShopItem = {
    id: uid(),
    label: label.trim(),
    cost: Math.max(1, Math.round(cost)),
    timesRedeemed: 0,
    builtIn: false,
  };
  return { ...state, shop: [...state.shop, item] };
}

export function deleteShopItem(state: GameState, id: string): GameState {
  return { ...state, shop: state.shop.filter(s => s.id !== id) };
}

export function redeem(
  state: GameState,
  id: string,
  now: number = Date.now(),
): { state: GameState; ok: boolean } {
  const item = state.shop.find(s => s.id === id);
  if (!item || state.hero.coins < item.cost) return { state, ok: false };

  let next: GameState = {
    ...state,
    hero: { ...state.hero, coins: state.hero.coins - item.cost },
    shop: state.shop.map(s => (s.id === id ? { ...s, timesRedeemed: s.timesRedeemed + 1 } : s)),
  };
  next = log(next, { kind: 'shop', text: item.label, coins: -item.cost }, now);
  return { state: next, ok: true };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function setSettings(state: GameState, patch: Partial<GameState['settings']>): GameState {
  return { ...state, settings: { ...state.settings, ...patch } };
}
