import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useGame } from '../store/GameProvider';
import { colors, font, radius, space } from '../theme';
import {
  currentMomentum,
  dayKey,
  momentumMultiplier,
  momentumTier,
  MOMENTUM_MAX,
} from '../game/engine';
import { activeQuests } from '../store/actions';
import { haptics } from '../ui/haptics';
import { Button, Card, Chip, Label, ProgressBar, Row, SectionHeader, Squish, Txt } from '../ui/primitives';

const DURATIONS = [2, 5, 10, 25];

/**
 * Spark: the activation-energy tool.
 *
 * Procrastination is almost never about the whole task, it is about starting.
 * So this pays out for sitting through a short timer — the reward is attached
 * to beginning, and the task itself usually carries on past the bell.
 */
export function SparkScreen() {
  const { state, finishSpark } = useGame();
  const [minutes, setMinutes] = useState(2);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const endsAt = useRef<number | null>(null);

  const running = remaining !== null;
  const momentum = currentMomentum(state.momentum);
  const tier = momentumTier(momentum);
  const suggestions = useMemo(() => activeQuests(state, dayKey()).slice(0, 4), [state]);

  const stop = useCallback(() => {
    endsAt.current = null;
    setRemaining(null);
  }, []);

  // Wall-clock driven rather than tick-counted, so a backgrounded app resumes
  // with the correct time left instead of a frozen countdown.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (endsAt.current === null) return;
      const left = Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        endsAt.current = null;
        setRemaining(null);
        finishSpark(minutes);
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, minutes, finishSpark]);

  const start = () => {
    haptics.reward(state.settings.haptics, false);
    endsAt.current = Date.now() + minutes * 60000;
    setRemaining(minutes * 60);
  };

  const total = minutes * 60;
  const elapsed = remaining === null ? 0 : total - remaining;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Card accent={tier.color}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Label color={colors.textDim}>Momentum</Label>
            <Txt variant="title" color={tier.color} style={{ marginTop: 2 }}>
              {Math.round(momentum)} / {MOMENTUM_MAX}
            </Txt>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt variant="title" color={colors.flame}>
              ×{momentumMultiplier(momentum).toFixed(2)}
            </Txt>
            <Label color={colors.textFaint}>on every payout</Label>
          </View>
        </Row>
        <View style={{ marginTop: space.md }}>
          <ProgressBar pct={momentum / MOMENTUM_MAX} tone={tier.color} />
        </View>
        <Txt variant="small" color={colors.textFaint} style={{ marginTop: space.sm }}>
          Halves every 6 hours. The cheapest time to do the next thing is always now.
        </Txt>
      </Card>

      <SectionHeader title="Spark timer" />

      {running ? (
        <RunningTimer remaining={remaining!} total={total} intent={intent} onCancel={stop} />
      ) : (
        <>
          <Card>
            <Txt variant="heading">Can't start?</Txt>
            <Txt variant="small" color={colors.textDim} style={{ marginTop: space.xs }}>
              Pick a length. Commit to only that. You get paid for the timer, not for finishing —
              and you will almost certainly keep going.
            </Txt>

            <Row style={{ marginTop: space.lg, flexWrap: 'wrap' }} gap={space.sm}>
              {DURATIONS.map(d => (
                <Chip
                  key={d}
                  label={`${d} min`}
                  tone={colors.flame}
                  selected={minutes === d}
                  onPress={() => {
                    haptics.select(state.settings.haptics);
                    setMinutes(d);
                  }}
                />
              ))}
            </Row>

            <Row style={{ marginTop: space.lg, justifyContent: 'space-between' }}>
              <Label color={colors.textFaint}>Pays on completion</Label>
              <Label color={colors.gold}>
                {12 * minutes} XP · {6 * minutes} coins · 🔥 +{Math.min(35, 10 + minutes * 2)}
              </Label>
            </Row>

            <View style={{ marginTop: space.lg }}>
              <Button label={`Start ${minutes}-minute Spark`} onPress={start} tone={colors.flame} full />
            </View>
          </Card>

          {suggestions.length > 0 && (
            <>
              <SectionHeader
                title="Point it at something"
                right={<Label color={colors.textFaint}>optional</Label>}
              />
              {suggestions.map(q => (
                <Squish
                  key={q.id}
                  onPress={() => {
                    haptics.select(state.settings.haptics);
                    setIntent(intent === q.title ? null : q.title);
                  }}
                  style={{ marginBottom: space.sm }}
                >
                  <Card
                    style={[
                      styles.intentCard,
                      intent === q.title && { borderColor: colors.flame },
                    ]}
                  >
                    <Text style={{ fontSize: 16 }}>{intent === q.title ? '🎯' : '○'}</Text>
                    <Txt variant="small" style={{ flex: 1 }} numberOfLines={1}>
                      {q.title}
                    </Txt>
                  </Card>
                </Squish>
              ))}
            </>
          )}
        </>
      )}

      <View style={{ height: space.xxl }} />
    </ScrollView>
  );
}

function RunningTimer({
  remaining,
  total,
  intent,
  onCancel,
}: {
  remaining: number;
  total: number;
  intent: string | null;
  onCancel: () => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  // A slow breath rather than a ticking clock — the timer should feel calm, so
  // the honest answer to "how long left" never becomes a reason to bail.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const mm = Math.floor(remaining / 60);
  const ss = `${remaining % 60}`.padStart(2, '0');

  return (
    <Card style={styles.timerCard} accent={colors.flame}>
      <Animated.View
        style={[
          styles.pulseRing,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.45] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
          },
        ]}
      />
      <Text style={styles.timerText}>
        {mm}:{ss}
      </Text>
      <Txt variant="small" color={colors.textDim} style={{ textAlign: 'center', marginTop: space.sm }}>
        {intent ?? 'Just this. Nothing else.'}
      </Txt>
      <View style={{ marginTop: space.lg, alignSelf: 'stretch' }}>
        <ProgressBar pct={(total - remaining) / total} tone={colors.flame} animate={false} />
      </View>
      <View style={{ marginTop: space.lg }}>
        <Button label="Give up" onPress={onCancel} tone={colors.surfaceHi} ink={colors.textDim} small />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.lg,
  },
  intentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  timerCard: {
    alignItems: 'center',
    paddingVertical: space.xxl,
  },
  pulseRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: radius.pill,
    backgroundColor: colors.flame,
    top: 10,
  },
  timerText: {
    fontSize: 68,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
  },
});
