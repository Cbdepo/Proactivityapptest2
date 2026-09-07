import { GameState } from '../types';
import { levelFromXp } from './engine';

export interface Achievement {
  id: string;
  label: string;
  detail: string;
  icon: string;
  /** Coin bounty paid on unlock. */
  bounty: number;
  /** Progress toward the goal, for the partially-filled bars on the Hero tab. */
  progress: (s: GameState) => { have: number; need: number };
}

const questsDone = (s: GameState) => s.quests.reduce((n, q) => n + q.timesCompleted, 0);
const bossesDone = (s: GameState) =>
  s.quests.filter(q => q.difficulty === 'boss').reduce((n, q) => n + q.timesCompleted, 0);

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-blood',
    label: 'First Blood',
    detail: 'Complete your first quest.',
    icon: '⚡',
    bounty: 25,
    progress: s => ({ have: questsDone(s), need: 1 }),
  },
  {
    id: 'ten-down',
    label: 'Warmed Up',
    detail: 'Complete 10 quests.',
    icon: '🏃',
    bounty: 60,
    progress: s => ({ have: questsDone(s), need: 10 }),
  },
  {
    id: 'fifty-down',
    label: 'Operator',
    detail: 'Complete 50 quests.',
    icon: '⚙️',
    bounty: 200,
    progress: s => ({ have: questsDone(s), need: 50 }),
  },
  {
    id: 'twohundred-down',
    label: 'Machine',
    detail: 'Complete 200 quests.',
    icon: '🤖',
    bounty: 750,
    progress: s => ({ have: questsDone(s), need: 200 }),
  },
  {
    id: 'streak-3',
    label: 'Three in a Row',
    detail: 'Hold a 3-day streak.',
    icon: '🔥',
    bounty: 50,
    progress: s => ({ have: s.streak.best, need: 3 }),
  },
  {
    id: 'streak-7',
    label: 'Full Week',
    detail: 'Hold a 7-day streak.',
    icon: '📅',
    bounty: 150,
    progress: s => ({ have: s.streak.best, need: 7 }),
  },
  {
    id: 'streak-30',
    label: 'Unbroken',
    detail: 'Hold a 30-day streak.',
    icon: '💎',
    bounty: 800,
    progress: s => ({ have: s.streak.best, need: 30 }),
  },
  {
    id: 'boss-1',
    label: 'Dragon Slayer',
    detail: 'Finish something you had been avoiding.',
    icon: '🐉',
    bounty: 100,
    progress: s => ({ have: bossesDone(s), need: 1 }),
  },
  {
    id: 'boss-10',
    label: 'No Dread Left',
    detail: 'Clear 10 Boss quests.',
    icon: '🗡️',
    bounty: 500,
    progress: s => ({ have: bossesDone(s), need: 10 }),
  },
  {
    id: 'spark-10',
    label: 'Ignition',
    detail: 'Finish 10 Spark timers.',
    icon: '🕯️',
    bounty: 80,
    progress: s => ({ have: s.sparkSessions, need: 10 }),
  },
  {
    id: 'spark-50',
    label: 'Never Not Starting',
    detail: 'Finish 50 Spark timers.',
    icon: '🚀',
    bounty: 350,
    progress: s => ({ have: s.sparkSessions, need: 50 }),
  },
  {
    id: 'crates-25',
    label: 'Lucky Hands',
    detail: 'Open 25 loot crates.',
    icon: '🎁',
    bounty: 120,
    progress: s => ({ have: s.cratesOpened, need: 25 }),
  },
  {
    id: 'level-5',
    label: 'Level 5',
    detail: 'Reach level 5.',
    icon: '🌱',
    bounty: 60,
    progress: s => ({ have: levelFromXp(s.hero.xp), need: 5 }),
  },
  {
    id: 'level-15',
    label: 'Level 15',
    detail: 'Reach level 15.',
    icon: '🌳',
    bounty: 300,
    progress: s => ({ have: levelFromXp(s.hero.xp), need: 15 }),
  },
  {
    id: 'level-30',
    label: 'Level 30',
    detail: 'Reach level 30.',
    icon: '👑',
    bounty: 1200,
    progress: s => ({ have: levelFromXp(s.hero.xp), need: 30 }),
  },
  {
    id: 'well-rounded',
    label: 'Well Rounded',
    detail: 'Earn 200 XP in every attribute.',
    icon: '⭐',
    bounty: 400,
    progress: s => {
      const values = Object.values(s.hero.attributes);
      return { have: Math.min(...values), need: 200 };
    },
  },
];

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(
  ACHIEVEMENTS.map(a => [a.id, a]),
) as Record<string, Achievement>;

/**
 * Returns achievements newly satisfied by `state` that are not yet recorded.
 * Called after every state mutation that could move a counter.
 */
export function newlyUnlocked(state: GameState): Achievement[] {
  return ACHIEVEMENTS.filter(a => {
    if (state.achievements[a.id]) return false;
    const { have, need } = a.progress(state);
    return have >= need;
  });
}
