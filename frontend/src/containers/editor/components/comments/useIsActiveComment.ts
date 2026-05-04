import { useSession } from '@/containers/editor/SessionStoreProvider';

/**
 * Wave 4 / T-55 — `selectIsActive(id)` derived from the session store.
 *
 * Subscribes only to the boolean comparison, so the consumer re-renders
 * exactly when its own active-state flips (not on every other comment's
 * focus change).
 */
export function useIsActiveComment(threadId: string): boolean {
    return useSession((s) => s.activeCommentId === threadId);
}
