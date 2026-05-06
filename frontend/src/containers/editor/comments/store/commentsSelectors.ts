import { CommentStatus, type CommentThread } from '@/editor/comments/types';
import type { Role, User } from '@/editor/identity/types';

import {
    CommentStatusFilter,
    type CommentFilterState,
    type CommentsState,
} from './commentsStore';

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

function threadInvolvesAuthorId(thread: CommentThread, authorId: string): boolean {
    return thread.authorId === authorId || thread.replies.some((r) => r.authorId === authorId);
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
    if (status === CommentStatusFilter.Orphan) return thread.status === CommentStatus.Orphan;
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
        if (filter.authorId && !threadInvolvesAuthorId(thread, filter.authorId)) return false;
        if (filter.role && !threadInvolvesRole(thread, filter.role as Role)) return false;
        return true;
    });
}

export function selectOpenResolved(visible: CommentThread[]): {
    open: CommentThread[];
    resolved: CommentThread[];
    orphaned: CommentThread[];
} {
    const open: CommentThread[] = [];
    const resolved: CommentThread[] = [];
    const orphaned: CommentThread[] = [];
    for (const t of visible) {
        if (t.status === CommentStatus.Open) open.push(t);
        else if (t.status === CommentStatus.Resolved) resolved.push(t);
        else orphaned.push(t);
    }
    return { open, resolved, orphaned };
}

export interface Participant {
    id: string
    name: string
    color: string
}

export function selectParticipants(threads: CommentThread[]): Participant[] {
    const map = new Map<string, Participant>();
    for (const t of threads) {
        if (!map.has(t.authorId)) map.set(t.authorId, { id: t.authorId, name: t.authorName, color: t.authorColor ?? '' });
        for (const r of t.replies) {
            if (!map.has(r.authorId)) map.set(r.authorId, { id: r.authorId, name: r.authorName, color: r.authorColor ?? '' });
        }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
