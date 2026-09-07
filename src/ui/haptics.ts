import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Rarity } from '../types';

/**
 * Touch is the fastest feedback channel there is — it lands before the
 * animation does. Every payout gets a pattern sized to how big it was, so the
 * hand learns the difference between "fine" and "jackpot" without reading.
 *
 * All calls are fire-and-forget: a device without a taptic engine should feel
 * nothing, never throw.
 */
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

function impact(style: Haptics.ImpactFeedbackStyle) {
  if (!supported) return;
  Haptics.impactAsync(style).catch(() => {});
}

function notify(type: Haptics.NotificationFeedbackType) {
  if (!supported) return;
  Haptics.notificationAsync(type).catch(() => {});
}

/** Space out a burst of taps into a rhythm the hand reads as one event. */
function pattern(steps: { at: number; run: () => void }[]) {
  for (const step of steps) {
    if (step.at === 0) step.run();
    else setTimeout(step.run, step.at);
  }
}

export const haptics = {
  light(on: boolean) {
    if (on) impact(Haptics.ImpactFeedbackStyle.Light);
  },

  select(on: boolean) {
    if (!on || !supported) return;
    Haptics.selectionAsync().catch(() => {});
  },

  /** Quest completion. `big` is a level-up or a crate drop. */
  reward(on: boolean, big: boolean) {
    if (!on) return;
    if (!big) {
      impact(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }
    pattern([
      { at: 0, run: () => impact(Haptics.ImpactFeedbackStyle.Heavy) },
      { at: 90, run: () => impact(Haptics.ImpactFeedbackStyle.Medium) },
      { at: 170, run: () => notify(Haptics.NotificationFeedbackType.Success) },
    ]);
  },

  /** Crate opening — the rattle scales with rarity. */
  loot(on: boolean, rarity: Rarity) {
    if (!on) return;
    const beats: Record<Rarity, number[]> = {
      common: [0],
      rare: [0, 110],
      epic: [0, 90, 180],
      legendary: [0, 70, 140, 210, 300],
    };
    pattern(
      beats[rarity].map((at, i) => ({
        at,
        run: () =>
          impact(
            i === beats[rarity].length - 1 && rarity !== 'common'
              ? Haptics.ImpactFeedbackStyle.Heavy
              : Haptics.ImpactFeedbackStyle.Light,
          ),
      })),
    );
  },

  purchase(on: boolean, ok: boolean) {
    if (!on) return;
    notify(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
  },
};
