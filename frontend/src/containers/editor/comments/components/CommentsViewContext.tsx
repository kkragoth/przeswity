import { createContext, useContext, type ReactNode } from 'react';
import type { Editor } from '@tiptap/react';

import type { MentionCandidate } from './MentionTextarea';

/**
 * Wave 4 / T-56 — view-scoped concerns shared across the comments subtree
 * after `CommentsContext` was deleted.
 *
 * Carries only values that are genuinely view-local: mention candidates
 * (peers + roles), the relative-time formatter (i18n-bound), and the editor
 * handle so resolve / remove flows can clear ProseMirror marks. Identity,
 * permissions and zustand state live elsewhere.
 */
export interface CommentsViewContextValue {
    candidates: MentionCandidate[];
    formatRelative: (ts: number) => string;
    editor: Editor | null;
}

const CommentsViewContext = createContext<CommentsViewContextValue | null>(null);

export function CommentsViewProvider({
    value,
    children,
}: {
    value: CommentsViewContextValue;
    children: ReactNode;
}) {
    return (
        <CommentsViewContext.Provider value={value}>
            {children}
        </CommentsViewContext.Provider>
    );
}

export function useCommentsView(): CommentsViewContextValue {
    const ctx = useContext(CommentsViewContext);
    if (!ctx) throw new Error('useCommentsView must be used inside <CommentsViewProvider>');
    return ctx;
}
