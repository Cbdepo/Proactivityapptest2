import { lootOdds, rollLoot } from '../loot';

/** Deterministic RNG so the table can be probed at exact points. */
function fixed(value: number) {
  return () => value;
}

describe('loot table', () => {
  it('always returns a drop, whatever the roll', () => {
    for (const r of [0, 0.001, 0.25, 0.5, 0.75, 0.999999]) {
      const drop = rollLoot(fixed(r));
      expect(drop.label).toBeTruthy();
      expect(['common', 'rare', 'epic', 'legendary']).toContain(drop.rarity);
    }
  });

  it('pays out non-negative amounts', () => {
    for (let i = 0; i < 400; i++) {
      const drop = rollLoot();
      expect(drop.coins).toBeGreaterThanOrEqual(0);
      expect(drop.xp).toBeGreaterThanOrEqual(0);
      expect(drop.momentum).toBeGreaterThanOrEqual(0);
      expect(drop.shields).toBeGreaterThanOrEqual(0);
      // Every entry has to be worth *something*, or a crate can feel like a bug.
      expect(drop.coins + drop.xp + drop.momentum + drop.shields).toBeGreaterThan(0);
    }
  });

  it('gives every drop a unique id', () => {
    const ids = new Set(Array.from({ length: 200 }, () => rollLoot().id));
    expect(ids.size).toBe(200);
  });

  it('publishes odds that sum to 100%', () => {
    const total = lootOdds().reduce((sum, o) => sum + o.pct, 0);
    expect(total).toBeCloseTo(100);
  });

  it('keeps legendaries rare', () => {
    const legendary = lootOdds().find(o => o.rarity === 'legendary');
    expect(legendary!.pct).toBeLessThan(5);
  });
});
