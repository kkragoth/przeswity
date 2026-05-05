import { createContext, useContext, useMemo, type Context, type ReactNode } from 'react';

import { permsFor } from '@/editor/identity/perms';
import type { RolePermissions, User } from '@/editor/identity/types';
import type { CollabBundle } from '@/editor/collab/yDoc';
import type { ToastFn } from '@/editor/shell/useToast';

/**
 * Stable per-session context (Wave 1 / T-10).
 *
 * Holds values that change at most once per session lifetime: identity,
 * permissions, the collab bundle, and the toast callback. High-churn
 * signals (editor instance, peers, suggesting mode) live in a separate
 * live store introduced in Wave 3 — keep them out of this context to
 * avoid render storms on awareness updates.
 */
export interface EditorSessionContextValue {
    user: User;
    perms: RolePermissions;
    bookId: string;
    bookTitle: string;
    collab: CollabBundle;
    toast: ToastFn;
}

const HMR_KEY = '__przeswity_EditorSessionContext';
type HmrGlobal = typeof globalThis & { [HMR_KEY]?: Context<EditorSessionContextValue | null> };
const hmrGlobal = globalThis as HmrGlobal;
const EditorSessionContext: Context<EditorSessionContextValue | null> =
    hmrGlobal[HMR_KEY] ?? (hmrGlobal[HMR_KEY] = createContext<EditorSessionContextValue | null>(null));

export interface EditorSessionProviderProps {
    user: User;
    bookId: string;
    bookTitle: string;
    collab: CollabBundle;
    toast: ToastFn;
    children: ReactNode;
}

export function EditorSessionProvider({
    user,
    bookId,
    bookTitle,
    collab,
    toast,
    children,
}: EditorSessionProviderProps) {
    // Resolve permissions once per session — the entire point of T-03b.
    const perms = useMemo(() => permsFor(user.role), [user.role]);

    const value = useMemo<EditorSessionContextValue>(
        () => ({ user, perms, bookId, bookTitle, collab, toast }),
        [user, perms, bookId, bookTitle, collab, toast],
    );

    return (
        <EditorSessionContext.Provider value={value}>
            {children}
        </EditorSessionContext.Provider>
    );
}

export function useEditorSession(): EditorSessionContextValue {
    const ctx = useContext(EditorSessionContext);
    if (!ctx) {
        throw new Error('useEditorSession must be used inside <EditorSessionProvider>');
    }
    return ctx;
}
