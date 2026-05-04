import { useMemo } from 'react';

import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useCommentThreads } from '@/editor/comments/useCommentThreads';
import type { CommentThread } from '@/editor/comments/types';

/**
 * Wave 4 / T-55 — `selectThread(id)` lookup as a hook.
 *
 * Thread DATA lives in the y-doc, not the comments zustand store; we read it
 * via the existing `useCommentThreads(doc)` subscription and pick the entry by id.
 * Returns `undefined` if the thread was removed mid-render — callers should
 * defensively `return null` when that happens.
 */
export function useThread(threadId: string): CommentThread | undefined {
    const { collab } = useEditorSession();
    const threads = useCommentThreads(collab.doc);
    return useMemo(
        () => threads.find((t) => t.id === threadId),
        [threads, threadId],
    );
}
