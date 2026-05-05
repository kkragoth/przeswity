import { createContext, useContext, useMemo, type Context, type ReactNode } from 'react';
import { useStoreWithEqualityFn } from 'zustand/traditional';

import {
    createSessionStore,
    type SessionState,
    type SessionStore,
} from '@/containers/editor/session/sessionStore';

/**
 * Wave 3 / T-40 — per-session transient UI store provider.
 *
 * Mounted inside `EditorLiveProvider` so the UI subtree can read scratch
 * state (`activeCommentId`, `pendingNewComment`, tab selections, find /
 * shortcuts visibility) without lifting it back into `EditorSessionUI`'s
 * `useState`s. See `createSessionStore` for the store shape.
 */
// HMR-stable context: when this module hot-reloads, the existing context
// (and its consumers) survive instead of being orphaned by a fresh instance.
const HMR_KEY = '__przeswity_SessionStoreContext';
type HmrGlobal = typeof globalThis & { [HMR_KEY]?: Context<SessionStore | null> };
const hmrGlobal = globalThis as HmrGlobal;
const SessionStoreContext: Context<SessionStore | null> =
    hmrGlobal[HMR_KEY] ?? (hmrGlobal[HMR_KEY] = createContext<SessionStore | null>(null));

export interface SessionStoreProviderProps {
    children: ReactNode;
}

export function SessionStoreProvider({ children }: SessionStoreProviderProps) {
    // T-80: memoise the store factory so React StrictMode's double-invoke
    // does not create two stores per session. Lifetime = mount → unmount of
    // the EditorSession (which already remounts on collab.id).
    const store = useMemo(() => createSessionStore(), []);
    return (
        <SessionStoreContext.Provider value={store}>
            {children}
        </SessionStoreContext.Provider>
    );
}

export function useSession<T>(
    selector: (state: SessionState) => T,
    equalityFn: (a: T, b: T) => boolean = Object.is,
): T {
    const store = useContext(SessionStoreContext);
    if (!store) throw new Error('useSession must be used inside <SessionStoreProvider>');
    return useStoreWithEqualityFn(store, selector, equalityFn);
}

/**
 * Imperative handle to the underlying store — used by callbacks that need to
 * trigger actions without subscribing to state. Prefer `useSession` for reads.
 */
export function useSessionStore(): SessionStore {
    const store = useContext(SessionStoreContext);
    if (!store) throw new Error('useSessionStore must be used inside <SessionStoreProvider>');
    return store;
}
