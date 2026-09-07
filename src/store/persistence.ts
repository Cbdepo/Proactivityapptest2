import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState } from '../types';
import { initialState } from '../game/seed';

const KEY = 'momentum:state:v1';

/**
 * Merge a loaded blob over a fresh state so a save written by an older build
 * (missing fields added since) still loads instead of crashing the app.
 */
function reconcile(loaded: Partial<GameState>): GameState {
  const base = initialState();
  return {
    ...base,
    ...loaded,
    hero: { ...base.hero, ...loaded.hero, attributes: { ...base.hero.attributes, ...loaded.hero?.attributes } },
    momentum: { ...base.momentum, ...loaded.momentum },
    streak: { ...base.streak, ...loaded.streak },
    daily: { ...base.daily, ...loaded.daily },
    settings: { ...base.settings, ...loaded.settings },
    quests: Array.isArray(loaded.quests) ? loaded.quests : base.quests,
    shop: Array.isArray(loaded.shop) ? loaded.shop : base.shop,
    log: Array.isArray(loaded.log) ? loaded.log : [],
    achievements: loaded.achievements ?? {},
  };
}

export async function loadState(): Promise<GameState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return initialState();
    return reconcile(JSON.parse(raw));
  } catch {
    // A corrupt save should cost you your progress, not the ability to launch.
    return initialState();
  }
}

export async function saveState(state: GameState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Nothing useful to do here; the in-memory state is still correct.
  }
}

export async function clearState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
