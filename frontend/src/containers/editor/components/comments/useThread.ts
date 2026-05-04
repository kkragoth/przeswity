import { useMemo } from 'react';

import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useThreads } from '@/editor/comments/useThreads';
import type { CommentThread } from '@/editor/comments/types';

/**
 * Wave 4 / T-55 — `selectThread(id)` lookup as a hook.
 *
 * Thread DATA lives in the y-doc, not the comments zustand store; we read it
 * via the existing `useThreads(doc)` subscription and pick the entry by id.
 * Returns `undefined` if the thread was removed mid-render — callers should
 * defensively `return null` when that happens.
 */
export function useThread(threadId: string): CommentThread | undefined {
    const { collab } = useEditorSession();
    const threads = useThreads(collab.doc);
    return useMemo(
        () => threads.find((t) => t.id === threadId),
        [threads, threadId],
    );
}
