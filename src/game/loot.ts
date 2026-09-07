import { LootDrop, Rarity } from '../types';
import { uid } from './engine';

/**
 * The variable-ratio core.
 *
 * Fixed rewards stop registering once they become predictable; randomised ones
 * do not. Every crate is a roll on this table, weighted so that the median
 * result is small and forgettable and the tail is genuinely exciting. Weights
 * are relative, not percentages — `rollLoot` normalises them.
 */
interface LootEntry {
  weight: number;
  rarity: Rarity;
  label: string;
  detail: string;
  /** Coins/XP are ranges, rolled per drop, so even repeats differ. */
  coins?: [number, number];
  xp?: [number, number];
  momentum?: number;
  shields?: number;
}

const TABLE: LootEntry[] = [
  {
    weight: 30,
    rarity: 'common',
    label: 'Coin Pouch',
    detail: 'A modest handful.',
    coins: [8, 25],
  },
  {
    weight: 18,
    rarity: 'common',
    label: 'Scrap XP',
    detail: 'Every bit counts.',
    xp: [10, 30],
  },
  {
    weight: 13,
    rarity: 'rare',
    label: 'Coin Cache',
    detail: 'Now we are talking.',
    coins: [40, 90],
  },
  {
    weight: 10,
    rarity: 'rare',
    label: 'Second Wind',
    detail: 'Momentum surges. Go again.',
    momentum: 25,
    xp: [15, 35],
  },
  {
    weight: 8,
    rarity: 'rare',
    label: 'Focus Elixir',
    detail: 'A clean shot of experience.',
    xp: [50, 110],
  },
  {
    weight: 7,
    rarity: 'epic',
    label: 'Streak Shield',
    detail: 'Survives one missed day. Automatically.',
    shields: 1,
    coins: [10, 30],
  },
  {
    weight: 6,
    rarity: 'epic',
    label: 'Overdrive',
    detail: 'Momentum slammed to the top.',
    momentum: 60,
    coins: [25, 60],
  },
  {
    weight: 5,
    rarity: 'epic',
    label: 'Treasure Hoard',
    detail: 'Somebody had a good week.',
    coins: [120, 260],
    xp: [40, 80],
  },
  {
    weight: 2,
    rarity: 'legendary',
    label: 'JACKPOT',
    detail: 'Coins, XP, momentum, the lot.',
    coins: [300, 650],
    xp: [150, 320],
    momentum: 40,
  },
  {
    weight: 1,
    rarity: 'legendary',
    label: "Phoenix Feather",
    detail: 'Two streak shields and a fortune.',
    shields: 2,
    coins: [200, 400],
    xp: [100, 200],
  },
];

const TOTAL_WEIGHT = TABLE.reduce((sum, e) => sum + e.weight, 0);

function rollRange(range: [number, number] | undefined, rng: () => number): number {
  if (!range) return 0;
  const [lo, hi] = range;
  return Math.round(lo + rng() * (hi - lo));
}

/** Draw one crate. Pass a seeded `rng` in tests; defaults to Math.random. */
export function rollLoot(rng: () => number = Math.random): LootDrop {
  let ticket = rng() * TOTAL_WEIGHT;
  let entry = TABLE[TABLE.length - 1];
  for (const candidate of TABLE) {
    ticket -= candidate.weight;
    if (ticket <= 0) {
      entry = candidate;
      break;
    }
  }
  return {
    id: uid(),
    label: entry.label,
    detail: entry.detail,
    rarity: entry.rarity,
    coins: rollRange(entry.coins, rng),
    xp: rollRange(entry.xp, rng),
    momentum: entry.momentum ?? 0,
    shields: entry.shields ?? 0,
  };
}

/** Odds shown in the UI, so the game is a slot machine but not a dishonest one. */
export function lootOdds(): { rarity: Rarity; pct: number }[] {
  const byRarity = new Map<Rarity, number>();
  for (const entry of TABLE) {
    byRarity.set(entry.rarity, (byRarity.get(entry.rarity) ?? 0) + entry.weight);
  }
  return [...byRarity.entries()].map(([rarity, weight]) => ({
    rarity,
    pct: (weight / TOTAL_WEIGHT) * 100,
  }));
}
