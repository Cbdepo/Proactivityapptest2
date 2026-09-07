import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameProvider, useGame } from './src/store/GameProvider';
import { colors } from './src/theme';
import { Hud } from './src/ui/Hud';
import { RewardOverlay } from './src/ui/RewardOverlay';
import { TabBar, TabKey } from './src/ui/TabBar';
import { QuestsScreen } from './src/screens/QuestsScreen';
import { SparkScreen } from './src/screens/SparkScreen';
import { LootScreen } from './src/screens/LootScreen';
import { HeroScreen } from './src/screens/HeroScreen';
import { haptics } from './src/ui/haptics';

export default function App() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <StatusBar style="light" />
        <Shell />
      </GameProvider>
    </SafeAreaProvider>
  );
}

/**
 * Four screens behind a hand-rolled tab switcher. All four are cheap enough to
 * mount on demand, and keeping navigation in-process means a reward overlay can
 * sit above everything without fighting a navigator for the top of the stack.
 */
function Shell() {
  const { state, ready, burst, dismissBurst } = useGame();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>('quests');

  if (!ready) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Hud />

      <View style={styles.body}>
        {tab === 'quests' && <QuestsScreen />}
        {tab === 'spark' && <SparkScreen />}
        {tab === 'loot' && <LootScreen />}
        {tab === 'hero' && <HeroScreen />}
      </View>

      <TabBar
        active={tab}
        badge={state.crates}
        insetBottom={insets.bottom}
        onChange={next => {
          haptics.select(state.settings.haptics);
          setTab(next);
        }}
      />

      <RewardOverlay burst={burst} onDismiss={dismissBurst} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  body: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
