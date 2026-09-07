import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useGame } from '../store/GameProvider';
import { Category, Difficulty, Repeat } from '../types';
import { colors, font, radius, space } from '../theme';
import { CATEGORIES, CATEGORY_ORDER, DIFFICULTIES, DIFFICULTY_ORDER } from '../game/engine';
import { haptics } from '../ui/haptics';
import { Button, Chip, Label, Row, Txt } from '../ui/primitives';

/**
 * Quest creation. Kept to one screen with sensible defaults pre-selected so a
 * new quest is two taps away — anything longer and people stop capturing tasks
 * at the moment they think of them.
 */
export function AddQuestSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, addQuest } = useGame();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('focus');
  const [difficulty, setDifficulty] = useState<Difficulty>('small');
  const [repeat, setRepeat] = useState<Repeat>('once');

  const reset = () => {
    setTitle('');
    setCategory('focus');
    setDifficulty('small');
    setRepeat('once');
  };

  const submit = () => {
    if (!title.trim()) return;
    addQuest({ title, category, difficulty, repeat });
    reset();
    onClose();
  };

  const spec = DIFFICULTIES[difficulty];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
      >
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Txt variant="title">New quest</Txt>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What needs doing?"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={submit}
              maxLength={120}
            />

            <Label style={styles.label}>Difficulty</Label>
            <Row style={styles.wrapRow} gap={space.sm}>
              {DIFFICULTY_ORDER.map(key => (
                <Chip
                  key={key}
                  label={DIFFICULTIES[key].label}
                  tone={DIFFICULTIES[key].color}
                  selected={difficulty === key}
                  onPress={() => {
                    haptics.select(state.settings.haptics);
                    setDifficulty(key);
                  }}
                />
              ))}
            </Row>
            <Txt variant="small" color={colors.textFaint} style={{ marginTop: space.sm }}>
              {spec.hint} · {spec.xp} XP · {spec.coins} coins ·{' '}
              {Math.round(spec.crateChance * 100)}% crate chance
            </Txt>

            <Label style={styles.label}>Attribute</Label>
            <Row style={styles.wrapRow} gap={space.sm}>
              {CATEGORY_ORDER.map(key => (
                <Chip
                  key={key}
                  label={`${CATEGORIES[key].icon} ${CATEGORIES[key].label}`}
                  tone={CATEGORIES[key].color}
                  selected={category === key}
                  onPress={() => {
                    haptics.select(state.settings.haptics);
                    setCategory(key);
                  }}
                />
              ))}
            </Row>

            <Label style={styles.label}>Repeat</Label>
            <Row gap={space.sm}>
              <Chip label="One-off" selected={repeat === 'once'} onPress={() => setRepeat('once')} />
              <Chip label="Every day" selected={repeat === 'daily'} onPress={() => setRepeat('daily')} />
            </Row>

            <View style={{ height: space.xl }} />
            <Button label="Add to board" onPress={submit} disabled={!title.trim()} full />
            <View style={{ height: space.lg }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6,6,14,0.7)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    maxHeight: '88%',
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: space.lg,
  },
  input: {
    ...font.body,
    color: colors.text,
    backgroundColor: colors.surfaceHi,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    marginTop: space.md,
  },
  label: {
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  wrapRow: {
    flexWrap: 'wrap',
  },
});
