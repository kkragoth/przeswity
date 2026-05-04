import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useStoreWithEqualityFn } from 'zustand/traditional';

import { useEditorSession } from '@/containers/editor/EditorSessionProvider';
import {
    createCommentsStore,
    type CommentsState,
    type CommentsStore,
} from '@/containers/editor/stores/createCommentsStore';

/**
 * Wave 4 / T-50 — per-session comments store provider.
 *
 * Mounted inside `SessionStoreProvider` so the comments subtree can read
 * filter / draft state and dispatch composed `doc.transact`-wrapped
 * mutations without lifting the surface back into prop drilling.
 *
 * Lifetime = mount → unmount of the `EditorSession` (which already remounts
 * on `collab.id`). T-80: memoise the store so React StrictMode's double
 * invocation does not produce two stores per session.
 */

const CommentsStoreContext = createContext<CommentsStore | null>(null);

export interface CommentsStoreProviderProps {
    children: ReactNode;
}

export function CommentsStoreProvider({ children }: CommentsStoreProviderProps) {
    const { collab, user } = useEditorSession();
    const store = useMemo(
        () => createCommentsStore(collab.doc, user),
        [collab.doc, user],
    );
    return (
        <CommentsStoreContext.Provider value={store}>
            {children}
        </CommentsStoreContext.Provider>
    );
}

export function useComments<T>(
    selector: (state: CommentsState) => T,
    equalityFn: (a: T, b: T) => boolean = Object.is,
): T {
    const store = useContext(CommentsStoreContext);
    if (!store) throw new Error('useComments must be used inside <CommentsStoreProvider>');
    return useStoreWithEqualityFn(store, selector, equalityFn);
}

/**
 * Imperative handle to the underlying store — used by callbacks that need to
 * trigger actions without subscribing to state. Prefer `useComments` for reads.
 */
export function useCommentsStore(): CommentsStore {
    const store = useContext(CommentsStoreContext);
    if (!store) throw new Error('useCommentsStore must be used inside <CommentsStoreProvider>');
    return store;
}
