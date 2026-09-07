import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { RewardBurst } from '../types';
import { colors, font, radius, space } from '../theme';
import { Confetti } from './Confetti';
import { Txt, Label } from './primitives';

/**
 * The payoff screen. Everything here exists to make the half-second after a
 * completion feel disproportionate to the effort: the number arrives large and
 * overshoots, confetti falls, the multiplier is called out by name.
 *
 * It dismisses itself so the loop never asks for a second tap to get back to
 * work.
 */
const AUTO_DISMISS_MS = 2600;

export function RewardOverlay({ burst, onDismiss }: { burst: RewardBurst | null; onDismiss: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const xpLift = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!burst) return;

    fade.setValue(0);
    pop.setValue(0);
    xpLift.setValue(0);

    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }),
      // Overshoot: the card lands harder than it needs to. That is the point.
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 14 }),
      Animated.timing(xpLift, {
        toValue: 1,
        duration: 900,
        delay: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    timer.current = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [burst, fade, pop, xpLift, onDismiss]);

  if (!burst) return null;

  const confettiColors = burst.levelUp
    ? [colors.gold, colors.primary, colors.green, '#FFFFFF']
    : [burst.accent, colors.primary, colors.gold];

  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fade }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      <Confetti runKey={`${burst.title}-${burst.xp}-${burst.coins}`} colors={confettiColors} />

      <Animated.View
        pointerEvents="none"
        style={[styles.card, { borderColor: burst.accent, transform: [{ scale }] }]}
      >
        {burst.levelUp !== null && (
          <View style={[styles.levelBanner, { backgroundColor: colors.gold }]}>
            <Text style={[font.micro, { color: '#0B0B14' }]}>LEVEL {burst.levelUp}</Text>
          </View>
        )}

        {/* Headline goes to whichever currency the payout actually moved, so a
            coins-only loot drop never announces itself as "+0 XP". */}
        <Animated.Text
          style={[
            styles.xp,
            {
              color: burst.accent,
              opacity: xpLift.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] }),
              transform: [
                { translateY: xpLift.interpolate({ inputRange: [0, 1], outputRange: [18, -6] }) },
              ],
            },
          ]}
        >
          {burst.xp > 0 ? `+${burst.xp} XP` : `+${burst.coins} ⛁`}
        </Animated.Text>

        <View style={styles.metaRow}>
          {burst.xp > 0 && burst.coins > 0 && (
            <View style={styles.metaPill}>
              <Text style={[font.small, { color: colors.gold }]}>+{burst.coins} ⛁</Text>
            </View>
          )}
          {burst.multiplier > 1.01 && (
            <View style={styles.metaPill}>
              <Text style={[font.small, { color: colors.flame }]}>
                ×{burst.multiplier.toFixed(2)}
              </Text>
            </View>
          )}
          {burst.momentumGain > 0 && (
            <View style={styles.metaPill}>
              <Text style={[font.small, { color: colors.flame }]}>🔥 +{burst.momentumGain}</Text>
            </View>
          )}
        </View>

        <Txt variant="heading" style={{ textAlign: 'center', marginTop: space.lg }} numberOfLines={2}>
          {burst.title}
        </Txt>
        <Txt
          variant="small"
          color={colors.textDim}
          style={{ textAlign: 'center', marginTop: space.xs }}
          numberOfLines={2}
        >
          {burst.subtitle}
        </Txt>

        {burst.unlocked.length > 0 && (
          <View style={styles.unlocks}>
            <Label color={colors.gold}>Unlocked</Label>
            {burst.unlocked.map(u => (
              <Txt key={u} variant="small" color={colors.gold} style={{ marginTop: 2 }}>
                {u}
              </Txt>
            ))}
          </View>
        )}
      </Animated.View>

      <Txt variant="micro" color={colors.textFaint} style={styles.tapHint}>
        TAP TO CONTINUE
      </Txt>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(6,6,14,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  card: {
    width: '82%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    paddingVertical: space.xxl,
    paddingHorizontal: space.xl,
    alignItems: 'center',
  },
  levelBanner: {
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginBottom: space.md,
  },
  xp: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  metaPill: {
    backgroundColor: colors.surfaceHi,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  unlocks: {
    marginTop: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  tapHint: {
    position: 'absolute',
    bottom: 60,
  },
});
