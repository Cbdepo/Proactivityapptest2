import { Category, Difficulty, GameState, MomentumState, Rarity } from '../types';
import { colors } from '../theme';

// ---------------------------------------------------------------------------
// Days
// ---------------------------------------------------------------------------

/** Local calendar day as YYYY-MM-DD. All streak/daily logic keys off this. */
export function dayKey(at: number = Date.now()): string {
  const d = new Date(at);
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function daysBetween(a: string, b: string): number {
  const parse = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((parse(b) - parse(a)) / 86400000);
}

// ---------------------------------------------------------------------------
// Levels
//
// Cumulative XP to reach level L is 50 * L * (L - 1): 100, 300, 600, 1000...
// The gap grows linearly, so early levels come fast (the first session should
// produce two or three of them) and later ones stay meaningful.
// ---------------------------------------------------------------------------

export function levelFromXp(xp: number): number {
  return Math.floor(0.5 + Math.sqrt(2500 + 200 * Math.max(0, xp)) / 100);
}

export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

/** Progress through the current level, as {into, span, pct}. */
export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const into = xp - floor;
  const span = ceil - floor;
  return { level, into, span, pct: span > 0 ? into / span : 0, toNext: ceil - xp };
}

// ---------------------------------------------------------------------------
// Difficulty
// ---------------------------------------------------------------------------

export interface DifficultySpec {
  key: Difficulty;
  label: string;
  hint: string;
  xp: number;
  coins: number;
  /** Momentum added on completion. */
  momentum: number;
  /** Probability a completion also drops a loot crate. */
  crateChance: number;
  color: string;
}

export const DIFFICULTIES: Record<Difficulty, DifficultySpec> = {
  spark: {
    key: 'spark',
    label: 'Spark',
    hint: 'Under 2 minutes',
    xp: 10,
    coins: 5,
    momentum: 8,
    crateChance: 0.12,
    color: '#8A8AA3',
  },
  small: {
    key: 'small',
    label: 'Small',
    hint: 'About 10 minutes',
    xp: 25,
    coins: 12,
    momentum: 14,
    crateChance: 0.2,
    color: '#4FC3F7',
  },
  standard: {
    key: 'standard',
    label: 'Standard',
    hint: 'Half an hour',
    xp: 60,
    coins: 30,
    momentum: 22,
    crateChance: 0.32,
    color: '#34D399',
  },
  epic: {
    key: 'epic',
    label: 'Epic',
    hint: 'An hour or more',
    xp: 140,
    coins: 70,
    momentum: 32,
    crateChance: 0.55,
    color: '#B980FF',
  },
  boss: {
    key: 'boss',
    label: 'Boss',
    hint: "The thing you've been avoiding",
    xp: 300,
    coins: 160,
    momentum: 45,
    crateChance: 1,
    color: '#FFC53D',
  },
};

export const DIFFICULTY_ORDER: Difficulty[] = ['spark', 'small', 'standard', 'epic', 'boss'];

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export interface CategorySpec {
  key: Category;
  label: string;
  icon: string;
  color: string;
  blurb: string;
}

export const CATEGORIES: Record<Category, CategorySpec> = {
  body: { key: 'body', label: 'Body', icon: '💪', color: colors.body, blurb: 'Move, eat, sleep' },
  mind: { key: 'mind', label: 'Mind', icon: '🧠', color: colors.mind, blurb: 'Learn and create' },
  focus: { key: 'focus', label: 'Focus', icon: '🎯', color: colors.focus, blurb: 'Deep work' },
  social: { key: 'social', label: 'Social', icon: '🤝', color: colors.social, blurb: 'People and reach-outs' },
  grit: { key: 'grit', label: 'Grit', icon: '🔥', color: colors.grit, blurb: 'Admin and dread' },
};

export const CATEGORY_ORDER: Category[] = ['body', 'mind', 'focus', 'social', 'grit'];

// ---------------------------------------------------------------------------
// Momentum
//
// The anti-procrastination mechanic. Momentum spikes when you finish something
// and decays with a six-hour half-life, so the cheapest time to do the next
// thing is always right now. It multiplies XP up to 2x at full bar.
// ---------------------------------------------------------------------------

const MOMENTUM_HALF_LIFE_HOURS = 6;
export const MOMENTUM_MAX = 100;

export function currentMomentum(m: MomentumState, now: number = Date.now()): number {
  const hours = Math.max(0, (now - m.updatedAt) / 3600000);
  const decayed = m.value * Math.pow(0.5, hours / MOMENTUM_HALF_LIFE_HOURS);
  return Math.max(0, Math.min(MOMENTUM_MAX, decayed));
}

export function addMomentum(m: MomentumState, amount: number, now: number = Date.now()): MomentumState {
  return {
    value: Math.max(0, Math.min(MOMENTUM_MAX, currentMomentum(m, now) + amount)),
    updatedAt: now,
  };
}

/** 1.00x at empty, 2.00x at full. */
export function momentumMultiplier(momentum: number): number {
  return 1 + momentum / MOMENTUM_MAX;
}

export function momentumTier(momentum: number): { label: string; color: string } {
  if (momentum >= 80) return { label: 'BLAZING', color: colors.gold };
  if (momentum >= 55) return { label: 'HOT', color: colors.flame };
  if (momentum >= 30) return { label: 'WARM', color: colors.social };
  if (momentum >= 10) return { label: 'FLICKERING', color: colors.textDim };
  return { label: 'COLD', color: colors.textFaint };
}

// ---------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------

/** +5% per streak day, capped at +50%. Small enough to stay honest. */
export function streakMultiplier(streak: number): number {
  return 1 + Math.min(0.5, Math.max(0, streak - 1) * 0.05);
}

/**
 * Roll the streak forward for activity on `today`. A single missed day is
 * absorbed by a shield if one is held — the streak survives, the shield burns.
 */
export function advanceStreak(
  streak: GameState['streak'],
  today: string,
): { streak: GameState['streak']; shieldUsed: boolean } {
  const { lastActiveDay } = streak;
  if (lastActiveDay === today) return { streak, shieldUsed: false };

  const gap = lastActiveDay ? daysBetween(lastActiveDay, today) : 1;
  let current = streak.current;
  let shields = streak.shields;
  let shieldUsed = false;

  if (!lastActiveDay || gap === 1) {
    current += 1;
  } else if (gap === 2 && shields > 0) {
    shields -= 1;
    shieldUsed = true;
    current += 1;
  } else {
    current = 1;
  }

  return {
    streak: {
      current,
      best: Math.max(streak.best, current),
      lastActiveDay: today,
      shields,
    },
    shieldUsed,
  };
}

/**
 * Streaks are only truthful if they expire. Called on load: if the last active
 * day is old enough, the streak is already broken and should read as zero.
 */
export function decayStreak(streak: GameState['streak'], today: string): GameState['streak'] {
  if (!streak.lastActiveDay) return streak;
  const gap = daysBetween(streak.lastActiveDay, today);
  if (gap <= 1) return streak;
  if (gap === 2 && streak.shields > 0) return streak; // a shield can still save it
  if (streak.current === 0) return streak;
  return { ...streak, current: 0 };
}

// ---------------------------------------------------------------------------
// Payout
// ---------------------------------------------------------------------------

export interface Payout {
  xp: number;
  coins: number;
  baseXp: number;
  multiplier: number;
  momentumGain: number;
  crate: boolean;
}

/**
 * What a completion is worth right now. Multipliers stack (momentum x streak)
 * which is what makes a chained afternoon feel dramatically better than the
 * same tasks spread thin.
 */
export function computePayout(
  difficulty: Difficulty,
  momentum: number,
  streak: number,
  roll: number = Math.random(),
): Payout {
  const spec = DIFFICULTIES[difficulty];
  const multiplier = momentumMultiplier(momentum) * streakMultiplier(streak);
  return {
    baseXp: spec.xp,
    xp: Math.round(spec.xp * multiplier),
    coins: Math.round(spec.coins * (1 + (multiplier - 1) * 0.5)),
    multiplier,
    momentumGain: spec.momentum,
    crate: roll < spec.crateChance,
  };
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

export function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`;
  return `${Math.round(n)}`;
}

export function relativeTime(at: number, now: number = Date.now()): string {
  const s = Math.max(0, Math.floor((now - at) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
