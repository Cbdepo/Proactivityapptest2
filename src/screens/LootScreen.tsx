import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useGame } from '../store/GameProvider';
import { colors, font, radius, rarityColors, space } from '../theme';
import { formatNumber } from '../game/engine';
import { lootOdds } from '../game/loot';
import { Button, Card, Empty, Label, Row, SectionHeader, Squish, Txt } from '../ui/primitives';
import { AddRewardSheet } from './AddRewardSheet';

/**
 * Loot and the reward shop.
 *
 * Crates are the variable-ratio half: unpredictable, immediate, worthless in
 * themselves. The shop is the other half — it converts coins into things you
 * actually want, which is what stops the currency from becoming pretend.
 */
export function LootScreen() {
  const { state, openCrate, redeem, deleteShopItem } = useGame();
  const [adding, setAdding] = useState(false);
  const odds = lootOdds();

  const affordable = state.shop.filter(s => state.hero.coins >= s.cost).length;

  const confirmRedeem = (id: string, label: string, cost: number) => {
    Alert.alert('Cash it in?', `${label}\n\nThis spends ${cost} coins. Then go and actually do it.`, [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Redeem', onPress: () => redeem(id) },
    ]);
  };

  const confirmDelete = (id: string, label: string) => {
    Alert.alert('Remove reward?', label, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteShopItem(id) },
    ]);
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <CrateBox count={state.crates} onOpen={openCrate} />

        <SectionHeader title="Crate odds" right={<Label color={colors.textFaint}>per open</Label>} />
        <Card style={{ paddingVertical: space.md }}>
          {odds.map(o => (
            <Row key={o.rarity} style={styles.oddsRow}>
              <View style={[styles.dot, { backgroundColor: rarityColors[o.rarity] }]} />
              <Txt variant="small" color={rarityColors[o.rarity]} style={{ flex: 1 }}>
                {o.rarity.toUpperCase()}
              </Txt>
              <Txt variant="small" color={colors.textDim}>
                {o.pct.toFixed(1)}%
              </Txt>
            </Row>
          ))}
        </Card>

        <SectionHeader
          title="Reward shop"
          right={
            <Label color={affordable > 0 ? colors.gold : colors.textFaint}>
              {formatNumber(state.hero.coins)} coins · {affordable} affordable
            </Label>
          }
        />

        {state.shop.length === 0 ? (
          <Empty
            icon="🛒"
            title="Nothing to buy"
            body="Coins only work if they buy something you genuinely want. Add a reward below."
          />
        ) : (
          state.shop
            .slice()
            .sort((a, b) => a.cost - b.cost)
            .map(item => {
              const can = state.hero.coins >= item.cost;
              return (
                <Squish
                  key={item.id}
                  onPress={() => (can ? confirmRedeem(item.id, item.label, item.cost) : undefined)}
                  onLongPress={() => confirmDelete(item.id, item.label)}
                  delayLongPress={450}
                  style={{ marginBottom: space.sm }}
                >
                  <Card style={[styles.shopCard, !can && { opacity: 0.5 }]} accent={can ? colors.gold : colors.border}>
                    <View style={{ flex: 1 }}>
                      <Txt variant="body" numberOfLines={2}>
                        {item.label}
                      </Txt>
                      {item.timesRedeemed > 0 && (
                        <Label color={colors.textFaint} style={{ marginTop: 4 }}>
                          redeemed {item.timesRedeemed}×
                        </Label>
                      )}
                    </View>
                    <View style={styles.price}>
                      <Text style={[font.heading, { color: can ? colors.gold : colors.textFaint }]}>
                        {formatNumber(item.cost)}
                      </Text>
                      <Label color={colors.textFaint}>coins</Label>
                    </View>
                  </Card>
                </Squish>
              );
            })
        )}

        <View style={{ height: space.lg }} />
        <Button label="+  New reward" onPress={() => setAdding(true)} tone={colors.gold} full />
        <Txt variant="small" color={colors.textFaint} style={{ marginTop: space.md, textAlign: 'center' }}>
          Long-press a reward to remove it.
        </Txt>
        <View style={{ height: space.xxl }} />
      </ScrollView>

      <AddRewardSheet visible={adding} onClose={() => setAdding(false)} />
    </>
  );
}

function CrateBox({ count, onOpen }: { count: number; onOpen: () => void }) {
  const shake = useRef(new Animated.Value(0)).current;

  // An unopened crate should never sit still. The wobble is the nag.
  useEffect(() => {
    if (count <= 0) {
      shake.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 110, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 110, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 110, useNativeDriver: true }),
        Animated.delay(1600),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [count, shake]);

  if (count <= 0) {
    return (
      <Card style={styles.crateCard}>
        <Text style={{ fontSize: 46, opacity: 0.3 }}>🎁</Text>
        <Txt variant="heading" color={colors.textDim} style={{ marginTop: space.sm }}>
          No crates
        </Txt>
        <Txt variant="small" color={colors.textFaint} style={{ textAlign: 'center', marginTop: space.xs }}>
          Every quest has a chance to drop one. Hitting your daily goal guarantees one. Bosses
          always drop.
        </Txt>
      </Card>
    );
  }

  return (
    <Squish onPress={onOpen} scaleTo={0.93}>
      <Card style={styles.crateCard} accent={colors.gold}>
        <Animated.Text
          style={{
            fontSize: 64,
            transform: [
              { rotate: shake.interpolate({ inputRange: [-1, 1], outputRange: ['-9deg', '9deg'] }) },
            ],
          }}
        >
          🎁
        </Animated.Text>
        <Txt variant="title" color={colors.gold} style={{ marginTop: space.sm }}>
          {count} crate{count === 1 ? '' : 's'} waiting
        </Txt>
        <Txt variant="small" color={colors.textDim} style={{ marginTop: space.xs }}>
          Tap to open
        </Txt>
      </Card>
    </Squish>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space.lg,
  },
  crateCard: {
    alignItems: 'center',
    paddingVertical: space.xxl,
  },
  oddsRow: {
    paddingVertical: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    paddingLeft: space.lg,
  },
  price: {
    alignItems: 'flex-end',
    marginLeft: space.md,
  },
});
