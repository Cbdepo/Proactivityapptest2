import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '../store/GameProvider';
import { colors, font, radius, space } from '../theme';
import { currentMomentum, formatNumber, levelProgress, momentumTier, momentumMultiplier } from '../game/engine';
import { ProgressBar, Row, Txt, Label } from './primitives';

/**
 * The always-visible status bar: level, XP to next, coins, streak, momentum.
 *
 * Momentum decays continuously, so this re-reads it on a timer — watching the
 * bar creep down is what makes "do the next thing now" feel like a cost rather
 * than a suggestion.
 */
const MOMENTUM_TICK_MS = 20000;

export function Hud() {
  const { state } = useGame();
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceTick(n => n + 1), MOMENTUM_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const { level, into, span, toNext } = levelProgress(state.hero.xp);
  const momentum = currentMomentum(state.momentum);
  const tier = momentumTier(momentum);
  const mult = momentumMultiplier(momentum);

  return (
    <LinearGradient
      colors={[colors.surfaceHi, colors.bg]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.wrap}
    >
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={space.sm}>
          <View style={styles.levelBadge}>
            <Text style={[font.heading, { color: colors.bg }]}>{level}</Text>
          </View>
          <View>
            <Label color={colors.textDim}>Level {level}</Label>
            <Txt variant="small" color={colors.textFaint}>
              {formatNumber(toNext)} XP to next
            </Txt>
          </View>
        </Row>

        <Row gap={space.md}>
          <View style={styles.stat}>
            <Text style={[font.heading, { color: colors.gold }]}>{formatNumber(state.hero.coins)}</Text>
            <Label color={colors.goldDim}>coins</Label>
          </View>
          <View style={styles.stat}>
            <Text style={[font.heading, { color: state.streak.current > 0 ? colors.flame : colors.textFaint }]}>
              {state.streak.current}
              {state.streak.shields > 0 ? ' 🛡' : ''}
            </Text>
            <Label color={colors.textFaint}>streak</Label>
          </View>
        </Row>
      </Row>

      <View style={{ marginTop: space.md }}>
        <ProgressBar pct={span > 0 ? into / span : 0} tone={colors.primary} height={8} />
      </View>

      <Row style={{ marginTop: space.md, justifyContent: 'space-between' }}>
        <Label color={tier.color}>🔥 momentum · {tier.label}</Label>
        <Label color={mult > 1.05 ? colors.flame : colors.textFaint}>×{mult.toFixed(2)} xp</Label>
      </Row>
      <View style={{ marginTop: space.xs }}>
        <ProgressBar pct={momentum / 100} tone={tier.color} height={6} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stat: {
    alignItems: 'flex-end',
  },
});
