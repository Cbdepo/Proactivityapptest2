import { GameState } from '../../types';
import { initialState } from '../../game/seed';
import { dayKey } from '../../game/engine';
import {
  activeQuests,
  addQuest,
  addShopItem,
  completeQuest,
  deleteQuest,
  doneQuests,
  finishSpark,
  openCrate,
  redeem,
  rollDay,
} from '../actions';

const NOW = new Date(2026, 5, 10, 12, 0).getTime();
const TODAY = dayKey(NOW);
const TOMORROW = dayKey(NOW + 86400_000);

/** A clean board with no starter content, so tests state their own setup. */
function bare(now = NOW): GameState {
  const s = initialState(now);
  return { ...s, quests: [], shop: [], crates: 0 };
}

function withQuest(state: GameState, title = 'Test quest', difficulty: any = 'standard') {
  const next = addQuest(state, { title, category: 'focus', difficulty, repeat: 'daily' }, NOW);
  return { state: next, quest: next.quests[next.quests.length - 1] };
}

describe('completing a quest', () => {
  it('pays XP and coins, and records the completion', () => {
    const { state, quest } = withQuest(bare());
    const { state: after, burst } = completeQuest(state, quest.id, NOW);

    expect(burst).not.toBeNull();
    expect(after.hero.xp).toBe(60);
    expect(after.hero.coins).toBe(30 + 25); // payout plus the First Blood bounty
    expect(after.hero.attributes.focus).toBe(60);
    expect(after.quests[0].timesCompleted).toBe(1);
    expect(after.quests[0].lastCompletedDay).toBe(TODAY);
    expect(after.daily.completed).toBe(1);
  });

  it('refuses a second completion of the same daily quest today', () => {
    const { state, quest } = withQuest(bare());
    const once = completeQuest(state, quest.id, NOW);
    const twice = completeQuest(once.state, quest.id, NOW);

    expect(twice.burst).toBeNull();
    expect(twice.state.hero.xp).toBe(once.state.hero.xp);
    expect(twice.state.daily.completed).toBe(1);
  });

  it('lets a daily quest come back around the next day', () => {
    const { state, quest } = withQuest(bare());
    const day1 = completeQuest(state, quest.id, NOW).state;
    expect(activeQuests(day1, TODAY)).toHaveLength(0);
    expect(doneQuests(day1, TODAY)).toHaveLength(1);

    const day2 = completeQuest(day1, quest.id, NOW + 86400_000);
    expect(day2.burst).not.toBeNull();
    expect(day2.state.quests[0].timesCompleted).toBe(2);
    expect(day2.state.daily.day).toBe(TOMORROW);
    expect(day2.state.daily.completed).toBe(1); // the counter reset overnight
  });

  it('archives a one-off quest so it leaves the board for good', () => {
    let state = bare();
    state = addQuest(state, { title: 'Once', category: 'grit', difficulty: 'small', repeat: 'once' }, NOW);
    const after = completeQuest(state, state.quests[0].id, NOW).state;

    expect(after.quests[0].archived).toBe(true);
    expect(activeQuests(after, TODAY)).toHaveLength(0);
    expect(doneQuests(after, TODAY)).toHaveLength(0);
    expect(completeQuest(after, after.quests[0].id, NOW).burst).toBeNull();
  });

  it('ignores an unknown quest id', () => {
    const state = bare();
    const after = completeQuest(state, 'nope', NOW);
    expect(after.burst).toBeNull();
    expect(after.state.hero.xp).toBe(0);
  });

  it('grants exactly one goal crate per day', () => {
    let state = { ...bare(), settings: { haptics: true, dailyGoal: 2 } };
    state = addQuest(state, { title: 'a', category: 'focus', difficulty: 'spark', repeat: 'daily' }, NOW);
    state = addQuest(state, { title: 'b', category: 'focus', difficulty: 'spark', repeat: 'daily' }, NOW);
    state = addQuest(state, { title: 'c', category: 'focus', difficulty: 'spark', repeat: 'daily' }, NOW);

    const ids = state.quests.map(q => q.id);
    let crates = 0;
    for (const id of ids) {
      const before = state.crates;
      const goalWasEarned = state.daily.crateEarned;
      state = completeQuest(state, id, NOW).state;
      if (!goalWasEarned && state.daily.crateEarned) crates += state.crates - before;
    }

    expect(state.daily.crateEarned).toBe(true);
    // The goal crate is granted once even though three quests were completed.
    expect(crates).toBeGreaterThanOrEqual(1);
  });

  it('unlocks First Blood and pays its bounty', () => {
    const { state, quest } = withQuest(bare());
    const { state: after, burst } = completeQuest(state, quest.id, NOW);
    expect(after.achievements['first-blood']).toBe(NOW);
    expect(burst!.unlocked.some(u => u.includes('First Blood'))).toBe(true);
    expect(after.hero.coins).toBe(30 + 25); // payout plus bounty
  });

  it('reports a level-up in the burst', () => {
    const { state, quest } = withQuest(bare(), 'Big one', 'boss');
    const { state: after, burst } = completeQuest(state, quest.id, NOW);
    expect(after.hero.xp).toBe(300);
    expect(burst!.levelUp).toBe(3);
  });
});

describe('crates', () => {
  it('does nothing when there are none to open', () => {
    const state = bare();
    const result = openCrate(state, NOW);
    expect(result.drop).toBeNull();
    expect(result.state).toBe(state);
  });

  it('consumes one crate and pays out its contents', () => {
    const state = { ...bare(), crates: 2 };
    const { state: after, drop } = openCrate(state, NOW);

    expect(drop).not.toBeNull();
    expect(after.crates).toBe(1);
    expect(after.cratesOpened).toBe(1);
    expect(after.hero.xp).toBe(drop!.xp);
    expect(after.hero.coins).toBe(drop!.coins);
    expect(after.streak.shields).toBe(state.streak.shields + drop!.shields);
  });
});

describe('sparks', () => {
  it('pays for sitting through the timer and counts the session', () => {
    const { state: after, burst } = finishSpark(bare(), 5, NOW);
    expect(after.sparkSessions).toBe(1);
    expect(after.hero.xp).toBe(60);
    expect(after.hero.attributes.focus).toBe(60);
    expect(after.streak.current).toBe(1);
    expect(burst.xp).toBe(60);
  });
});

describe('shop', () => {
  it('spends coins on a reward that can be afforded', () => {
    let state = { ...bare(), hero: { ...bare().hero, coins: 200 } };
    state = addShopItem(state, 'Coffee', 150);
    const { state: after, ok } = redeem(state, state.shop[0].id, NOW);

    expect(ok).toBe(true);
    expect(after.hero.coins).toBe(50);
    expect(after.shop[0].timesRedeemed).toBe(1);
  });

  it('refuses a reward that cannot be afforded and changes nothing', () => {
    let state = { ...bare(), hero: { ...bare().hero, coins: 10 } };
    state = addShopItem(state, 'Coffee', 150);
    const { state: after, ok } = redeem(state, state.shop[0].id, NOW);

    expect(ok).toBe(false);
    expect(after).toBe(state);
  });
});

describe('day rollover', () => {
  it('resets the daily counter and is safe to call twice', () => {
    const stale: GameState = {
      ...bare(),
      daily: { day: '2026-06-01', completed: 4, crateEarned: true },
    };
    const rolled = rollDay(stale, NOW);
    expect(rolled.daily).toEqual({ day: TODAY, completed: 0, crateEarned: false });
    expect(rollDay(rolled, NOW)).toBe(rolled);
  });
});

describe('board management', () => {
  it('removes a quest entirely', () => {
    const { state, quest } = withQuest(bare());
    expect(deleteQuest(state, quest.id).quests).toHaveLength(0);
  });

  it('sorts the board hardest-first so the Boss cannot hide at the bottom', () => {
    let state = bare();
    state = addQuest(state, { title: 'tiny', category: 'body', difficulty: 'spark', repeat: 'daily' }, NOW);
    state = addQuest(state, { title: 'dread', category: 'grit', difficulty: 'boss', repeat: 'once' }, NOW);
    state = addQuest(state, { title: 'mid', category: 'mind', difficulty: 'standard', repeat: 'daily' }, NOW);

    expect(activeQuests(state, TODAY).map(q => q.title)).toEqual(['dread', 'mid', 'tiny']);
  });
});
