import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type Context,
    type ReactNode,
} from 'react';
import type { Editor } from '@tiptap/react';
import { useStoreWithEqualityFn } from 'zustand/traditional';

import { usePeers } from '@/containers/editor/peers/hooks/usePeers';
import { useSuggestingMode } from '@/containers/editor/suggestions/hooks/useSuggestingMode';
import { createLiveStore, type LiveState, type LiveStore } from '@/containers/editor/session/liveStore';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';

/**
 * Wave 3 / T-20 — split the live signals out of the stable session provider.
 *
 * Two contexts live here:
 *
 *  - `EditorContext` is a plain React context for the TipTap `Editor` handle.
 *    It changes ~once per session (when `useEditorInit` finishes booting), so
 *    the cost of a full subtree re-render on that single transition is fine.
 *  - `EditorLiveStoreContext` exposes a per-session zustand store carrying the
 *    high-churn signals (`peers`, `suggesting`). Consumers subscribe with
 *    `useEditorLive(selector, eq?)` so a peers tick re-renders only the
 *    leaves that actually select peers.
 *
 * Plan §2.C / r2-pb-3: putting `peers` (~30Hz awareness) and `suggesting`
 * (y-map observer) in the same React context as `user`/`bookId`/`perms`
 * would re-render every consumer of those stable values on every cursor
 * move. Splitting providers + selecting through a store fixes both.
 */

interface EditorContextValue {
    editor: Editor | null;
    setEditor: (editor: Editor | null) => void;
}

type HmrGlobal = typeof globalThis & {
    __przeswity_EditorContext?: Context<EditorContextValue | null>
    __przeswity_EditorLiveStoreContext?: Context<LiveStore | null>
};
const hmrGlobal = globalThis as HmrGlobal;
const EditorContext: Context<EditorContextValue | null> =
    hmrGlobal.__przeswity_EditorContext
    ?? (hmrGlobal.__przeswity_EditorContext = createContext<EditorContextValue | null>(null));
const EditorLiveStoreContext: Context<LiveStore | null> =
    hmrGlobal.__przeswity_EditorLiveStoreContext
    ?? (hmrGlobal.__przeswity_EditorLiveStoreContext = createContext<LiveStore | null>(null));

export interface EditorLiveProviderProps {
    children: ReactNode;
}

export function EditorLiveProvider({ children }: EditorLiveProviderProps) {
    const { collab, user } = useEditorSession();

    // T-80: memoise the store factory so React StrictMode's double-invoke
    // does not create two stores per session. Lifetime = mount→unmount of
    // the EditorSession (which already remounts on collab.id).
    const liveStore = useMemo(() => createLiveStore(), []);

    const [editor, setEditor] = useState<Editor | null>(null);
    const editorValue = useMemo<EditorContextValue>(
        () => ({ editor, setEditor }),
        [editor],
    );

    // Source the live signals here, push them into the store. Leaves read
    // through the store so a peers tick does not bubble up the React tree.
    const peers = usePeers(collab.provider);
    const suggesting = useSuggestingMode(collab.doc, user.role);

    useEffect(() => {
        liveStore.getState().setPeers(peers);
    }, [liveStore, peers]);

    useEffect(() => {
        liveStore.getState().setSuggesting(suggesting);
    }, [liveStore, suggesting]);

    return (
        <EditorContext.Provider value={editorValue}>
            <EditorLiveStoreContext.Provider value={liveStore}>
                {children}
            </EditorLiveStoreContext.Provider>
        </EditorContext.Provider>
    );
}

export function useEditor(): Editor | null {
    const ctx = useContext(EditorContext);
    if (!ctx) throw new Error('useEditor must be used inside <EditorLiveProvider>');
    return ctx.editor;
}

export function useSetEditor(): (editor: Editor | null) => void {
    const ctx = useContext(EditorContext);
    if (!ctx) throw new Error('useSetEditor must be used inside <EditorLiveProvider>');
    return ctx.setEditor;
}

export function useEditorLive<T>(
    selector: (state: LiveState) => T,
    equalityFn: (a: T, b: T) => boolean = Object.is,
): T {
    const store = useContext(EditorLiveStoreContext);
    if (!store) throw new Error('useEditorLive must be used inside <EditorLiveProvider>');
    return useStoreWithEqualityFn(store, selector, equalityFn);
}

/** Test-only — exposes the underlying store for harness-driven assertions. */
export function useEditorLiveStore(): LiveStore {
    const store = useContext(EditorLiveStoreContext);
    if (!store) throw new Error('useEditorLiveStore must be used inside <EditorLiveProvider>');
    return store;
}
