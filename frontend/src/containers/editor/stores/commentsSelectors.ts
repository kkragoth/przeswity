import { CommentStatus, type CommentThread } from '@/editor/comments/types';
import type { Role, User } from '@/editor/identity/types';

import {
    CommentStatusFilter,
    type CommentFilterState,
    type CommentsState,
} from '@/containers/editor/stores/createCommentsStore';

/**
 * Wave 4 / T-50 — pure selectors over `CommentsState` plus thread-list
 * derivations that take y-doc-owned data as an external argument.
 *
 * Selectors that index by `threadId`/`replyId` are factories: they take the
 * id and return a `(state) => T` so callers can pass them to
 * `useComments(selectReplyDraft(id))`.
 */

export const selectFilter = (s: CommentsState) => s.filter;
export const selectInitialDraft = (s: CommentsState) => s.initialDraft;
export const selectEditText = (s: CommentsState) => s.editText;
export const selectEditTarget = (s: CommentsState) => s.editTarget;

export const selectReplyDraft = (threadId: string) => (s: CommentsState): string =>
    s.replyDrafts[threadId] ?? '';

export const selectIsEditingThread = (threadId: string) => (s: CommentsState): boolean =>
    s.editTarget?.kind === 'thread' && s.editTarget.threadId === threadId;

export const selectIsEditingReply =
    (threadId: string, replyId: string) =>
        (s: CommentsState): boolean =>
            s.editTarget?.kind === 'reply'
        && s.editTarget.threadId === threadId
        && s.editTarget.replyId === replyId;

// ---------------------------------------------------------------------------
// Thread-list derivations (filter logic moved from `useCommentThreads.ts`).
// Pure helpers — caller supplies the y-doc-owned thread list.
// ---------------------------------------------------------------------------

function threadInvolvesAuthor(thread: CommentThread, name: string): boolean {
    return thread.authorName === name || thread.replies.some((r) => r.authorName === name);
}

function threadInvolvesRole(thread: CommentThread, role: Role): boolean {
    return thread.authorRole === role || thread.replies.some((r) => r.authorRole === role);
}

function matchesStatus(
    thread: CommentThread,
    status: CommentStatusFilter,
    currentUser: User,
): boolean {
    if (status === CommentStatusFilter.All) return true;
    if (status === CommentStatusFilter.Open) return thread.status === CommentStatus.Open;
    if (status === CommentStatusFilter.Resolved) return thread.status === CommentStatus.Resolved;
    return (
        thread.authorId === currentUser.id
        || thread.replies.some((r) => r.authorId === currentUser.id)
    );
}

export function selectVisible(
    threads: CommentThread[],
    filter: CommentFilterState,
    currentUser: User,
): CommentThread[] {
    const sorted = [...threads].sort((a, b) => a.createdAt - b.createdAt);
    return sorted.filter((thread) => {
        if (!matchesStatus(thread, filter.status, currentUser)) return false;
        if (filter.author && !threadInvolvesAuthor(thread, filter.author)) return false;
        if (filter.role && !threadInvolvesRole(thread, filter.role as Role)) return false;
        return true;
    });
}

export function selectOpenResolved(visible: CommentThread[]): {
    open: CommentThread[];
    resolved: CommentThread[];
} {
    const open: CommentThread[] = [];
    const resolved: CommentThread[] = [];
    for (const t of visible) {
        if (t.status === CommentStatus.Open) open.push(t);
        else resolved.push(t);
    }
    return { open, resolved };
}

export function selectAuthors(threads: CommentThread[]): string[] {
    const set = new Set<string>();
    for (const t of threads) {
        set.add(t.authorName);
        for (const r of t.replies) set.add(r.authorName);
    }
    return [...set].sort();
}
