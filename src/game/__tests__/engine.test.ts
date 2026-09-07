import {
  addMomentum,
  advanceStreak,
  computePayout,
  currentMomentum,
  dayKey,
  daysBetween,
  decayStreak,
  levelFromXp,
  levelProgress,
  momentumMultiplier,
  streakMultiplier,
  xpForLevel,
} from '../engine';

describe('levels', () => {
  it('starts at level 1 with no XP', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
  });

  it('is the exact inverse of the level cost curve', () => {
    for (let level = 1; level <= 60; level++) {
      const cost = xpForLevel(level);
      expect(levelFromXp(cost)).toBe(level);
      if (level > 1) expect(levelFromXp(cost - 1)).toBe(level - 1);
    }
  });

  it('reports progress within the current level', () => {
    const p = levelProgress(150); // level 2 spans 100..300
    expect(p.level).toBe(2);
    expect(p.into).toBe(50);
    expect(p.span).toBe(200);
    expect(p.toNext).toBe(150);
    expect(p.pct).toBeCloseTo(0.25);
  });

  it('never returns a level below 1 for junk input', () => {
    expect(levelFromXp(-500)).toBe(1);
  });
});

describe('momentum', () => {
  const now = 1_700_000_000_000;

  it('halves over six hours', () => {
    const m = { value: 80, updatedAt: now };
    expect(currentMomentum(m, now)).toBeCloseTo(80);
    expect(currentMomentum(m, now + 6 * 3600_000)).toBeCloseTo(40);
    expect(currentMomentum(m, now + 12 * 3600_000)).toBeCloseTo(20);
  });

  it('decays toward zero but never below it', () => {
    const m = { value: 100, updatedAt: now };
    expect(currentMomentum(m, now + 1000 * 3600_000)).toBeGreaterThanOrEqual(0);
  });

  it('adds on top of the decayed value, capped at the maximum', () => {
    const m = { value: 80, updatedAt: now };
    const later = now + 6 * 3600_000; // decayed to 40
    expect(addMomentum(m, 30, later).value).toBeCloseTo(70);
    expect(addMomentum(m, 500, later).value).toBe(100);
  });

  it('multiplies payouts from 1x to 2x', () => {
    expect(momentumMultiplier(0)).toBe(1);
    expect(momentumMultiplier(50)).toBe(1.5);
    expect(momentumMultiplier(100)).toBe(2);
  });
});

describe('streaks', () => {
  it('counts consecutive days', () => {
    let streak = { current: 0, best: 0, lastActiveDay: null as string | null, shields: 0 };
    streak = advanceStreak(streak, '2026-03-01').streak;
    streak = advanceStreak(streak, '2026-03-02').streak;
    streak = advanceStreak(streak, '2026-03-03').streak;
    expect(streak.current).toBe(3);
    expect(streak.best).toBe(3);
  });

  it('is idempotent within a single day', () => {
    const start = { current: 2, best: 5, lastActiveDay: '2026-03-02', shields: 0 };
    const again = advanceStreak(start, '2026-03-02');
    expect(again.streak).toBe(start);
    expect(again.shieldUsed).toBe(false);
  });

  it('resets after a missed day with no shield', () => {
    const start = { current: 9, best: 9, lastActiveDay: '2026-03-01', shields: 0 };
    const next = advanceStreak(start, '2026-03-03');
    expect(next.streak.current).toBe(1);
    expect(next.streak.best).toBe(9);
    expect(next.shieldUsed).toBe(false);
  });

  it('spends a shield to survive exactly one missed day', () => {
    const start = { current: 9, best: 9, lastActiveDay: '2026-03-01', shields: 1 };
    const next = advanceStreak(start, '2026-03-03');
    expect(next.shieldUsed).toBe(true);
    expect(next.streak.current).toBe(10);
    expect(next.streak.shields).toBe(0);
  });

  it('will not let a shield cover a two-day gap', () => {
    const start = { current: 9, best: 9, lastActiveDay: '2026-03-01', shields: 1 };
    const next = advanceStreak(start, '2026-03-04');
    expect(next.shieldUsed).toBe(false);
    expect(next.streak.current).toBe(1);
    expect(next.streak.shields).toBe(1);
  });

  it('expires a lapsed streak on load', () => {
    const stale = { current: 12, best: 12, lastActiveDay: '2026-03-01', shields: 0 };
    expect(decayStreak(stale, '2026-03-01').current).toBe(12);
    expect(decayStreak(stale, '2026-03-02').current).toBe(12);
    expect(decayStreak(stale, '2026-03-05').current).toBe(0);
  });

  it('holds a lapsed streak open while a shield could still save it', () => {
    const stale = { current: 12, best: 12, lastActiveDay: '2026-03-01', shields: 1 };
    expect(decayStreak(stale, '2026-03-03').current).toBe(12);
  });

  it('caps the streak bonus at +50%', () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(1)).toBe(1);
    expect(streakMultiplier(3)).toBeCloseTo(1.1);
    expect(streakMultiplier(100)).toBe(1.5);
  });
});

describe('payouts', () => {
  it('pays the base rate with no momentum and no streak', () => {
    const p = computePayout('standard', 0, 0, 1);
    expect(p.baseXp).toBe(60);
    expect(p.xp).toBe(60);
    expect(p.multiplier).toBe(1);
  });

  it('stacks momentum and streak multipliers', () => {
    const p = computePayout('standard', 100, 11, 1);
    expect(p.multiplier).toBeCloseTo(2 * 1.5);
    expect(p.xp).toBe(180);
  });

  it('scales coins more gently than XP', () => {
    const p = computePayout('standard', 100, 0, 1);
    expect(p.xp).toBe(120); // 2x
    expect(p.coins).toBe(45); // 1.5x
  });

  it('always drops a crate for a Boss quest', () => {
    expect(computePayout('boss', 0, 0, 0.999).crate).toBe(true);
  });

  it('gates crates on the difficulty drop rate', () => {
    expect(computePayout('spark', 0, 0, 0.05).crate).toBe(true);
    expect(computePayout('spark', 0, 0, 0.5).crate).toBe(false);
  });
});

describe('day keys', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(dayKey(new Date(2026, 0, 5, 13, 0).getTime())).toBe('2026-01-05');
  });

  it('measures whole days across month boundaries', () => {
    expect(daysBetween('2026-02-27', '2026-03-01')).toBe(2);
    expect(daysBetween('2026-03-01', '2026-03-01')).toBe(0);
  });
});
