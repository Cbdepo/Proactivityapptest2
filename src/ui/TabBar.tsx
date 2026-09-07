import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, space } from '../theme';
import { Squish } from './primitives';

export type TabKey = 'quests' | 'spark' | 'loot' | 'hero';

export interface TabDef {
  key: TabKey;
  label: string;
  icon: string;
}

export const TABS: TabDef[] = [
  { key: 'quests', label: 'Quests', icon: '⚔️' },
  { key: 'spark', label: 'Spark', icon: '⚡' },
  { key: 'loot', label: 'Loot', icon: '🎁' },
  { key: 'hero', label: 'Hero', icon: '🏅' },
];

export function TabBar({
  active,
  onChange,
  /** Unopened crates, shown as a badge so loot is never quietly waiting. */
  badge,
  insetBottom,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
  badge: number;
  insetBottom: number;
}) {
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(space.sm, insetBottom) }]}>
      {TABS.map(tab => {
        const selected = tab.key === active;
        return (
          <Squish
            key={tab.key}
            testID={`tab-${tab.key}`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            onPress={() => onChange(tab.key)}
            scaleTo={0.9}
            wrapperStyle={styles.tab}
            style={styles.tabContent}
          >
            <View style={styles.tabInner}>
              <Text style={{ fontSize: 22, opacity: selected ? 1 : 0.45 }}>{tab.icon}</Text>
              {tab.key === 'loot' && badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                font.micro,
                { color: selected ? colors.primary : colors.textFaint, marginTop: 2 },
              ]}
            >
              {tab.label.toUpperCase()}
            </Text>
          </Squish>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space.sm,
  },
  tab: {
    flex: 1,
  },
  tabContent: {
    alignItems: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -12,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
});
