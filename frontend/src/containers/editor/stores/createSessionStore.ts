import { createStore, type StoreApi } from 'zustand/vanilla';

import { LeftTab } from '@/containers/editor/components/LeftPane';
import { RightTab } from '@/containers/editor/components/RightPane';

/**
 * Per-session transient UI store (T-40, plan §2.A).
 *
 * Owns the short-lived UI state that used to be `useState` hooks scattered
 * across `EditorSession`: which comment is active, a queued just-created
 * comment, the active left/right pane tabs, and the find / shortcuts modal
 * visibility flags.
 *
 * Created via `createSessionStore()` from `SessionStoreProvider` and held
 * inside `useMemo` so React StrictMode's double invoke does not produce
 * two stores per session (T-80). Lifetime = mount → unmount of the
 * `EditorSession` (which already remounts on `collab.id` change).
 */
export interface PendingComment {
    id: string;
    quote: string;
}

export interface SessionState {
    activeCommentId: string | null;
    pendingNewComment: PendingComment | null;
    leftTab: LeftTab;
    rightTab: RightTab;
    findOpen: boolean;
    shortcutsOpen: boolean;

    setActiveComment: (id: string | null) => void;
    enqueuePendingComment: (a: PendingComment) => void;
    consumePendingComment: () => PendingComment | null;
    setLeftTab: (t: LeftTab) => void;
    setRightTab: (t: RightTab) => void;
    openFind: () => void;
    closeFind: () => void;
    toggleShortcuts: () => void;
    closeShortcuts: () => void;
}

export type SessionStore = StoreApi<SessionState>;

export const createSessionStore = (): SessionStore =>
    createStore<SessionState>()((set, get) => ({
        activeCommentId: null,
        pendingNewComment: null,
        leftTab: LeftTab.Outline,
        rightTab: RightTab.Comments,
        findOpen: false,
        shortcutsOpen: false,
        setActiveComment: (id) => set({ activeCommentId: id }),
        enqueuePendingComment: (a) => set({ pendingNewComment: a }),
        consumePendingComment: () => {
            const v = get().pendingNewComment;
            if (v) set({ pendingNewComment: null });
            return v;
        },
        setLeftTab: (t) => set({ leftTab: t }),
        setRightTab: (t) => set({ rightTab: t }),
        openFind: () => set({ findOpen: true }),
        closeFind: () => set({ findOpen: false }),
        toggleShortcuts: () => set((s) => ({ shortcutsOpen: !s.shortcutsOpen })),
        closeShortcuts: () => set({ shortcutsOpen: false }),
    }));
