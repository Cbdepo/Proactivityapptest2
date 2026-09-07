import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useGame } from '../store/GameProvider';
import { Quest } from '../types';
import { colors, font, radius, space } from '../theme';
import {
  CATEGORIES,
  DIFFICULTIES,
  currentMomentum,
  dayKey,
  computePayout,
} from '../game/engine';
import { activeQuests, doneQuests } from '../store/actions';
import { Button, Card, Empty, Label, ProgressBar, Row, SectionHeader, Squish, Txt } from '../ui/primitives';
import { AddQuestSheet } from './AddQuestSheet';

export function QuestsScreen() {
  const { state, completeQuest, deleteQuest } = useGame();
  const [adding, setAdding] = useState(false);
  const today = dayKey();

  const open = useMemo(() => activeQuests(state, today), [state, today]);
  const done = useMemo(() => doneQuests(state, today), [state, today]);

  const momentum = currentMomentum(state.momentum);
  const goal = state.settings.dailyGoal;
  const progress = Math.min(1, state.daily.completed / goal);

  const confirmDelete = (quest: Quest) => {
    Alert.alert('Remove quest?', quest.title, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteQuest(quest.id) },
    ]);
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.goalCard} accent={progress >= 1 ? colors.green : colors.primary}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <Label color={colors.textDim}>Today's goal</Label>
              <Txt variant="title" style={{ marginTop: 2 }}>
                {state.daily.completed} / {goal} quests
              </Txt>
            </View>
            <Text style={{ fontSize: 34 }}>{progress >= 1 ? '🏆' : '🎯'}</Text>
          </Row>
          <View style={{ marginTop: space.md }}>
            <ProgressBar pct={progress} tone={progress >= 1 ? colors.green : colors.primary} />
          </View>
          <Txt variant="small" color={colors.textFaint} style={{ marginTop: space.sm }}>
            {progress >= 1
              ? state.daily.crateEarned
                ? 'Goal cleared. Crate is waiting on the Loot tab.'
                : 'Goal cleared.'
              : `${goal - state.daily.completed} more to earn a guaranteed crate.`}
          </Txt>
        </Card>

        <SectionHeader
          title={`Open · ${open.length}`}
          right={<Label color={colors.textFaint}>tap to complete</Label>}
        />

        {open.length === 0 ? (
          <Empty
            icon="🌙"
            title="Board is clear"
            body="Everything on today's board is done. Add something small — a Spark takes two minutes and still pays."
          />
        ) : (
          open.map(quest => (
            <QuestCard
              key={quest.id}
              quest={quest}
              momentum={momentum}
              streak={state.streak.current}
              onComplete={() => completeQuest(quest.id)}
              onLongPress={() => confirmDelete(quest)}
            />
          ))
        )}

        {done.length > 0 && (
          <>
            <SectionHeader title={`Done today · ${done.length}`} />
            {done.map(quest => (
              <View key={quest.id} style={styles.doneRow}>
                <Text style={{ fontSize: 16 }}>✅</Text>
                <Txt variant="small" color={colors.textFaint} style={styles.doneText} numberOfLines={1}>
                  {quest.title}
                </Txt>
                <Label color={colors.textFaint}>{DIFFICULTIES[quest.difficulty].label}</Label>
              </View>
            ))}
          </>
        )}

        <View style={{ height: space.xl }} />
        <Button label="+  New quest" onPress={() => setAdding(true)} full />
        <View style={{ height: space.xxl }} />
      </ScrollView>

      <AddQuestSheet visible={adding} onClose={() => setAdding(false)} />
    </>
  );
}

function QuestCard({
  quest,
  momentum,
  streak,
  onComplete,
  onLongPress,
}: {
  quest: Quest;
  momentum: number;
  streak: number;
  onComplete: () => void;
  onLongPress: () => void;
}) {
  const diff = DIFFICULTIES[quest.difficulty];
  const cat = CATEGORIES[quest.category];

  // Show the live value, multipliers included, so the price of waiting is
  // visible on the card itself rather than buried in a stats screen.
  const payout = computePayout(quest.difficulty, momentum, streak, 1);

  return (
    <Squish onPress={onComplete} onLongPress={onLongPress} delayLongPress={450} style={{ marginBottom: space.sm }}>
      <Card accent={diff.color} style={styles.questCard}>
        <View style={[styles.check, { borderColor: diff.color }]} />
        <View style={styles.questBody}>
          <Txt variant="body" numberOfLines={2}>
            {quest.title}
          </Txt>
          <Row style={{ marginTop: space.sm }} gap={space.sm}>
            <View style={[styles.tag, { borderColor: diff.color }]}>
              <Text style={[font.micro, { color: diff.color }]}>{diff.label.toUpperCase()}</Text>
            </View>
            <Text style={[font.micro, { color: cat.color }]}>
              {cat.icon} {cat.label.toUpperCase()}
            </Text>
            {quest.repeat === 'daily' && (
              <Text style={[font.micro, { color: colors.textFaint }]}>↻ DAILY</Text>
            )}
          </Row>
        </View>
        <View style={styles.payout}>
          <Text style={[font.heading, { color: diff.color }]}>+{payout.xp}</Text>
          <Label color={colors.goldDim}>+{payout.coins} ⛁</Label>
        </View>
      </Card>
    </Squish>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.lg,
  },
  goalCard: {
    marginBottom: space.sm,
  },
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    paddingLeft: space.lg,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 2,
    marginRight: space.md,
  },
  questBody: {
    flex: 1,
  },
  tag: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  payout: {
    alignItems: 'flex-end',
    marginLeft: space.sm,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
  },
  doneText: {
    flex: 1,
    textDecorationLine: 'line-through',
  },
});
