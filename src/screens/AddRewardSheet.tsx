import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useGame } from '../store/GameProvider';
import { colors, font, radius, space } from '../theme';
import { Button, Chip, Label, Row, Txt } from '../ui/primitives';

/** Price suggestions, so nobody has to invent a coin economy from scratch. */
const PRESETS = [60, 150, 400, 1000];

export function AddRewardSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { addShopItem } = useGame();
  const [label, setLabel] = useState('');
  const [cost, setCost] = useState('150');

  const parsed = parseInt(cost, 10);
  const valid = label.trim().length > 0 && Number.isFinite(parsed) && parsed > 0;

  const submit = () => {
    if (!valid) return;
    addShopItem(label, parsed);
    setLabel('');
    setCost('150');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
      >
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Txt variant="title">New reward</Txt>
          <Txt variant="small" color={colors.textDim} style={{ marginTop: space.xs }}>
            Something you actually want, that you would otherwise take for free.
          </Txt>

          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. an hour of the game"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            autoFocus
            maxLength={80}
          />

          <Label style={{ marginTop: space.xl, marginBottom: space.sm }}>Price in coins</Label>
          <TextInput
            value={cost}
            onChangeText={t => setCost(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            style={styles.input}
            maxLength={6}
          />
          <Row style={{ marginTop: space.md, flexWrap: 'wrap' }} gap={space.sm}>
            {PRESETS.map(p => (
              <Chip
                key={p}
                label={`${p}`}
                tone={colors.gold}
                selected={parsed === p}
                onPress={() => setCost(`${p}`)}
              />
            ))}
          </Row>

          <View style={{ height: space.xl }} />
          <Button label="Add to shop" onPress={submit} tone={colors.gold} disabled={!valid} full />
          <View style={{ height: space.lg }} />
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
});
