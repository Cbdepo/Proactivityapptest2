import { GameState, Quest, ShopItem } from '../types';
import { dayKey, uid } from './engine';

/**
 * A brand-new board. Seeded rather than empty because an empty list on first
 * launch is the single most common place these apps lose people — there has to
 * be something tappable within two seconds of install.
 */
const STARTER_QUESTS: Omit<Quest, 'id' | 'createdAt' | 'lastCompletedDay' | 'timesCompleted' | 'archived'>[] = [
  { title: 'Drink a full glass of water', category: 'body', difficulty: 'spark', repeat: 'daily' },
  { title: 'Make the bed', category: 'grit', difficulty: 'spark', repeat: 'daily' },
  { title: 'Write down the one thing that matters today', category: 'focus', difficulty: 'spark', repeat: 'daily' },
  { title: 'Move for 15 minutes', category: 'body', difficulty: 'small', repeat: 'daily' },
  { title: 'Read 10 pages', category: 'mind', difficulty: 'small', repeat: 'daily' },
  { title: 'Send one message you have been putting off', category: 'social', difficulty: 'small', repeat: 'once' },
  { title: 'One 30-minute block of real work, phone in another room', category: 'focus', difficulty: 'standard', repeat: 'daily' },
  { title: 'The thing you have been avoiding all week', category: 'grit', difficulty: 'boss', repeat: 'once' },
];

const STARTER_SHOP: Omit<ShopItem, 'id' | 'timesRedeemed'>[] = [
  { label: '20 minutes of guilt-free scrolling', cost: 60, builtIn: true },
  { label: 'One episode of something', cost: 120, builtIn: true },
  { label: 'Takeaway instead of cooking', cost: 350, builtIn: true },
  { label: 'A full evening off, no guilt', cost: 500, builtIn: true },
  { label: 'Buy yourself the thing in the cart', cost: 1500, builtIn: true },
];

export function initialState(now: number = Date.now()): GameState {
  return {
    version: 1,
    createdAt: now,
    hero: {
      xp: 0,
      coins: 0,
      attributes: { body: 0, mind: 0, focus: 0, social: 0, grit: 0 },
    },
    momentum: { value: 0, updatedAt: now },
    streak: { current: 0, best: 0, lastActiveDay: null, shields: 1 },
    daily: { day: dayKey(now), completed: 0, crateEarned: false },
    quests: STARTER_QUESTS.map(q => ({
      ...q,
      id: uid(),
      createdAt: now,
      lastCompletedDay: null,
      timesCompleted: 0,
      archived: false,
    })),
    shop: STARTER_SHOP.map(s => ({ ...s, id: uid(), timesRedeemed: 0 })),
    achievements: {},
    log: [],
    crates: 1, // one free crate, so the loot mechanic is discovered immediately
    sparkSessions: 0,
    cratesOpened: 0,
    settings: { haptics: true, dailyGoal: 3 },
  };
}
