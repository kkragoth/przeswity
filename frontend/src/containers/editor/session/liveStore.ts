import { createStore, type StoreApi } from 'zustand/vanilla';

import type { Peer } from '@/containers/editor/hooks/usePeers';
import type { SuggestingModeState } from '@/containers/editor/suggestions/hooks/useSuggestingMode';

/**
 * Per-session live signal store (T-20, plan §2.C).
 *
 * Holds the high-churn signals that must NOT live in the stable
 * `EditorSessionProvider` context: `peers` (yjs awareness — fires on every
 * cursor move) and `suggesting` (y-map observer). Consumers subscribe via
 * `useEditorLive(selector, eq?)` so a peers update re-renders only the leaves
 * that actually read peers.
 *
 * The store is created once per session via `createLiveStore()` from
 * `EditorLiveProvider` and held inside `useMemo` so React StrictMode's double
 * invocation does not produce two stores per session (see T-80).
 */
export interface LiveState {
    peers: Peer[];
    suggesting: SuggestingModeState;
    setPeers: (peers: Peer[]) => void;
    setSuggesting: (suggesting: SuggestingModeState) => void;
}

const noop = () => undefined;

const INITIAL_SUGGESTING: SuggestingModeState = {
    effective: false,
    forced: false,
    stored: false,
    setMode: noop,
};

export type LiveStore = StoreApi<LiveState>;

export const createLiveStore = (): LiveStore =>
    createStore<LiveState>()((set) => ({
        peers: [],
        suggesting: INITIAL_SUGGESTING,
        setPeers: (peers) => set({ peers }),
        setSuggesting: (suggesting) => set({ suggesting }),
    }));
