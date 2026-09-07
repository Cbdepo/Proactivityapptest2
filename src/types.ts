/** The five things a quest can train. Each is an RPG attribute you level. */
export type Category = 'body' | 'mind' | 'focus' | 'social' | 'grit';

/**
 * Size of the ask. `spark` exists so there is always a task small enough that
 * refusing it feels sillier than doing it; `boss` is the thing you have been
 * avoiding, priced so that avoiding it visibly costs you.
 */
export type Difficulty = 'spark' | 'small' | 'standard' | 'epic' | 'boss';

export type Repeat = 'once' | 'daily';

export interface Quest {
  id: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  repeat: Repeat;
  createdAt: number;
  /** Day string (YYYY-MM-DD) this quest was last completed, or null. */
  lastCompletedDay: string | null;
  timesCompleted: number;
  /** One-off quests are archived once done so the board stays clean. */
  archived: boolean;
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

/** A single roll off the loot table. */
export interface LootDrop {
  id: string;
  label: string;
  detail: string;
  rarity: Rarity;
  coins: number;
  xp: number;
  momentum: number;
  shields: number;
}

/** A real-life reward the user buys with coins. This is where coins cash out. */
export interface ShopItem {
  id: string;
  label: string;
  cost: number;
  timesRedeemed: number;
  builtIn: boolean;
}

export type LogKind = 'quest' | 'loot' | 'spark' | 'shop' | 'level' | 'achievement';

export interface LogEntry {
  id: string;
  kind: LogKind;
  text: string;
  at: number;
  xp?: number;
  coins?: number;
}

export interface Hero {
  xp: number;
  coins: number;
  attributes: Record<Category, number>;
}

export interface MomentumState {
  /** 0..100. Decays with time; read it through `currentMomentum`. */
  value: number;
  updatedAt: number;
}

export interface StreakState {
  current: number;
  best: number;
  lastActiveDay: string | null;
  /** Spends automatically to survive one missed day. */
  shields: number;
}

export interface DailyState {
  day: string;
  completed: number;
  /** Set once the day's goal crate has been handed out. */
  crateEarned: boolean;
}

export interface GameState {
  version: number;
  createdAt: number;
  hero: Hero;
  momentum: MomentumState;
  streak: StreakState;
  daily: DailyState;
  quests: Quest[];
  shop: ShopItem[];
  /** Achievement id -> unlock timestamp. */
  achievements: Record<string, number>;
  log: LogEntry[];
  /** Unopened loot crates. */
  crates: number;
  sparkSessions: number;
  cratesOpened: number;
  settings: {
    haptics: boolean;
    dailyGoal: number;
  };
}

/** Everything a single completion paid out, for the reward overlay to show. */
export interface RewardBurst {
  title: string;
  subtitle: string;
  xp: number;
  coins: number;
  momentumGain: number;
  multiplier: number;
  crate: boolean;
  levelUp: number | null;
  unlocked: string[];
  accent: string;
}
