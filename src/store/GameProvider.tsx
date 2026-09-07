import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Category, Difficulty, GameState, LootDrop, Repeat, RewardBurst } from '../types';
import { initialState } from '../game/seed';
import { clearState, loadState, saveState } from './persistence';
import * as A from './actions';
import { haptics } from '../ui/haptics';

interface GameContextValue {
  state: GameState;
  ready: boolean;
  /** The reward overlay currently owning the screen, or null. */
  burst: RewardBurst | null;
  dismissBurst: () => void;
  addQuest: (input: { title: string; category: Category; difficulty: Difficulty; repeat: Repeat }) => void;
  deleteQuest: (id: string) => void;
  completeQuest: (id: string) => void;
  openCrate: () => LootDrop | null;
  finishSpark: (minutes: number) => void;
  addShopItem: (label: string, cost: number) => void;
  deleteShopItem: (id: string) => void;
  redeem: (id: string) => boolean;
  setSettings: (patch: Partial<GameState['settings']>) => void;
  reset: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

const SAVE_DEBOUNCE_MS = 400;

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(() => initialState());
  const [ready, setReady] = useState(false);
  const [burst, setBurst] = useState<RewardBurst | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Actions read through this ref rather than the `state` closure so that two
  // taps landing in the same frame both build on the newer value. Every write
  // goes through `commit`, which keeps the two in step.
  const stateRef = useRef(state);
  const commit = useCallback((next: GameState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  // Load once, then roll forward to today in case the app was closed across a
  // midnight boundary.
  useEffect(() => {
    let cancelled = false;
    loadState().then(loaded => {
      if (cancelled) return;
      stateRef.current = A.rollDay(loaded);
      setState(stateRef.current);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced persistence. A single completion produces several rapid updates,
  // and that is exactly the moment we least want to block on storage.
  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveState(state), SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, ready]);

  // Returning from the background can cross midnight, and momentum has decayed
  // while we were away — re-roll and flush.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') commit(A.rollDay(stateRef.current));
      else saveState(stateRef.current);
    });
    return () => sub.remove();
  }, [commit]);

  const hapticsOn = state.settings.haptics;

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      ready,
      burst,
      dismissBurst: () => setBurst(null),

      addQuest: input => {
        haptics.light(hapticsOn);
        commit(A.addQuest(stateRef.current, input));
      },

      deleteQuest: id => {
        haptics.light(hapticsOn);
        commit(A.deleteQuest(stateRef.current, id));
      },

      completeQuest: id => {
        const result = A.completeQuest(stateRef.current, id);
        commit(result.state);
        if (!result.burst) return;
        haptics.reward(hapticsOn, result.burst.levelUp !== null || result.burst.crate);
        setBurst(result.burst);
      },

      openCrate: () => {
        const result = A.openCrate(stateRef.current);
        if (!result.drop) return null;
        commit(result.state);
        haptics.loot(hapticsOn, result.drop.rarity);
        setBurst(result.burst);
        return result.drop;
      },

      finishSpark: minutes => {
        const result = A.finishSpark(stateRef.current, minutes);
        commit(result.state);
        haptics.reward(hapticsOn, true);
        setBurst(result.burst);
      },

      addShopItem: (label, cost) => {
        haptics.light(hapticsOn);
        commit(A.addShopItem(stateRef.current, label, cost));
      },

      deleteShopItem: id => commit(A.deleteShopItem(stateRef.current, id)),

      redeem: id => {
        const result = A.redeem(stateRef.current, id);
        commit(result.state);
        haptics.purchase(hapticsOn, result.ok);
        return result.ok;
      },

      setSettings: patch => commit(A.setSettings(stateRef.current, patch)),

      reset: () => {
        clearState();
        commit(initialState());
        setBurst(null);
      },
    }),
    [state, ready, burst, hapticsOn, commit],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}
