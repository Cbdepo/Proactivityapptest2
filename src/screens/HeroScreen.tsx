import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useGame } from '../store/GameProvider';
import { colors, font, radius, space } from '../theme';
import {
  CATEGORIES,
  CATEGORY_ORDER,
  formatNumber,
  levelFromXp,
  levelProgress,
  relativeTime,
} from '../game/engine';
import { ACHIEVEMENTS } from '../game/achievements';
import { Card, Chip, Divider, Label, ProgressBar, Row, SectionHeader, Squish, Txt } from '../ui/primitives';

const GOAL_OPTIONS = [1, 3, 5, 8];

export function HeroScreen() {
  const { state, setSettings, reset } = useGame();
  const { level, into, span, toNext } = levelProgress(state.hero.xp);

  const totalQuests = state.quests.reduce((n, q) => n + q.timesCompleted, 0);
  const unlockedCount = Object.keys(state.achievements).length;

  // Attribute bars are relative to your own strongest suit, which makes the
  // neglected ones obvious without needing an absolute scale.
  const attrValues = CATEGORY_ORDER.map(c => state.hero.attributes[c]);
  const attrMax = Math.max(1, ...attrValues);

  const confirmReset = () => {
    Alert.alert(
      'Erase everything?',
      'Levels, coins, streak, quests and rewards all go back to zero. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Erase', style: 'destructive', onPress: reset },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Card accent={colors.primary}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Label color={colors.textDim}>Level</Label>
            <Text style={[font.display, { color: colors.text }]}>{level}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Label color={colors.textDim}>Total XP</Label>
            <Text style={[font.title, { color: colors.primary }]}>{formatNumber(state.hero.xp)}</Text>
          </View>
        </Row>
        <View style={{ marginTop: space.md }}>
          <ProgressBar pct={span > 0 ? into / span : 0} />
        </View>
        <Txt variant="small" color={colors.textFaint} style={{ marginTop: space.sm }}>
          {formatNumber(toNext)} XP to level {level + 1}
        </Txt>

        <Divider style={{ marginVertical: space.lg }} />

        <Row style={{ justifyContent: 'space-between' }}>
          <Stat label="Quests" value={`${totalQuests}`} />
          <Stat label="Sparks" value={`${state.sparkSessions}`} />
          <Stat label="Crates" value={`${state.cratesOpened}`} />
          <Stat label="Best streak" value={`${state.streak.best}`} tone={colors.flame} />
        </Row>
      </Card>

      <SectionHeader title="Attributes" />
      <Card>
        {CATEGORY_ORDER.map((key, i) => {
          const cat = CATEGORIES[key];
          const value = state.hero.attributes[key];
          return (
            <View key={key} style={{ marginTop: i === 0 ? 0 : space.lg }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="small">
                  {cat.icon}  {cat.label}
                </Txt>
                <Row gap={space.sm}>
                  <Label color={colors.textFaint}>lvl {levelFromXp(value)}</Label>
                  <Label color={cat.color}>{formatNumber(value)}</Label>
                </Row>
              </Row>
              <View style={{ marginTop: 6 }}>
                <ProgressBar pct={value / attrMax} tone={cat.color} height={7} />
              </View>
            </View>
          );
        })}
      </Card>

      <SectionHeader
        title="Achievements"
        right={
          <Label color={colors.gold}>
            {unlockedCount} / {ACHIEVEMENTS.length}
          </Label>
        }
      />
      {ACHIEVEMENTS.map(a => {
        const unlocked = Boolean(state.achievements[a.id]);
        const { have, need } = a.progress(state);
        return (
          <Card key={a.id} style={[styles.achievement, !unlocked && { opacity: 0.6 }]} accent={unlocked ? colors.gold : undefined}>
            <Text style={{ fontSize: 24, opacity: unlocked ? 1 : 0.35 }}>{a.icon}</Text>
            <View style={{ flex: 1 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="small" color={unlocked ? colors.gold : colors.text}>
                  {a.label}
                </Txt>
                <Label color={colors.textFaint}>
                  {unlocked ? 'unlocked' : `${Math.min(have, need)}/${need}`}
                </Label>
              </Row>
              <Txt variant="small" color={colors.textFaint} style={{ marginTop: 2 }} numberOfLines={1}>
                {a.detail}
              </Txt>
              {!unlocked && (
                <View style={{ marginTop: 6 }}>
                  <ProgressBar pct={have / need} tone={colors.goldDim} height={4} />
                </View>
              )}
            </View>
          </Card>
        );
      })}

      <SectionHeader title="Recent" />
      {state.log.length === 0 ? (
        <Card>
          <Txt variant="small" color={colors.textFaint}>
            Nothing yet. Go complete something.
          </Txt>
        </Card>
      ) : (
        <Card style={{ paddingVertical: space.sm }}>
          {state.log.slice(0, 12).map(entry => (
            <Row key={entry.id} style={styles.logRow}>
              <Text style={{ fontSize: 14 }}>{LOG_ICON[entry.kind]}</Text>
              <Txt variant="small" style={{ flex: 1 }} numberOfLines={1}>
                {entry.text}
              </Txt>
              {entry.xp ? <Label color={colors.primary}>+{entry.xp}</Label> : null}
              {entry.coins ? (
                <Label color={entry.coins > 0 ? colors.gold : colors.danger}>
                  {entry.coins > 0 ? '+' : ''}
                  {entry.coins}
                </Label>
              ) : null}
              <Label color={colors.textFaint}>{relativeTime(entry.at)}</Label>
            </Row>
          ))}
        </Card>
      )}

      <SectionHeader title="Settings" />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Txt variant="small">Haptics</Txt>
            <Txt variant="small" color={colors.textFaint} style={{ marginTop: 2 }}>
              Half the reward is in the buzz.
            </Txt>
          </View>
          <Switch
            value={state.settings.haptics}
            onValueChange={v => setSettings({ haptics: v })}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.text}
          />
        </Row>

        <Divider style={{ marginVertical: space.lg }} />

        <Txt variant="small">Daily goal</Txt>
        <Txt variant="small" color={colors.textFaint} style={{ marginTop: 2 }}>
          Quests per day for a guaranteed crate. Set it low enough that you clear it on a bad day.
        </Txt>
        <Row style={{ marginTop: space.md }} gap={space.sm}>
          {GOAL_OPTIONS.map(g => (
            <Chip
              key={g}
              label={`${g}`}
              selected={state.settings.dailyGoal === g}
              onPress={() => setSettings({ dailyGoal: g })}
            />
          ))}
        </Row>
      </Card>

      <View style={{ height: space.lg }} />
      <Squish onPress={confirmReset}>
        <Card style={{ borderColor: colors.danger }}>
          <Txt variant="small" color={colors.danger}>
            Erase all progress
          </Txt>
          <Txt variant="small" color={colors.textFaint} style={{ marginTop: 4 }}>
            Tap to start over from level 1.
          </Txt>
        </Card>
      </Squish>

      <View style={{ height: space.xxl }} />
    </ScrollView>
  );
}

function Stat({ label, value, tone = colors.text }: { label: string; value: string; tone?: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={[font.heading, { color: tone }]}>{value}</Text>
      <Label color={colors.textFaint}>{label}</Label>
    </View>
  );
}

const LOG_ICON: Record<string, string> = {
  quest: '⚔️',
  loot: '🎁',
  spark: '⚡',
  shop: '🛒',
  level: '⬆️',
  achievement: '🏅',
};

const styles = StyleSheet.create({
  content: {
    padding: space.lg,
  },
  achievement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingLeft: space.lg,
    marginBottom: space.sm,
  },
  logRow: {
    paddingVertical: 7,
  },
});
