import * as Y from 'yjs';
import type { StoreApi } from 'zustand/vanilla';

import { getThreadMap } from '@/editor/comments/threadOps';
import { toggleEmojiPresence } from '@/editor/comments/reactions';
import {
    CommentStatus,
    type CommentReply,
    type CommentThread,
    type OrphanMetadata,
} from '@/editor/comments/types';
import type { User } from '@/editor/identity/types';
import { makeId } from '@/editor/utils';
import { assertNever } from '@/lib/assert';

import type { CommentsState } from './commentsStore';

/**
 * Composed comment mutators wrapped in `doc.transact` so observers see one
 * logical event per user-facing operation. Plumbed into the store factory in
 * `commentsStore.ts` — see that file for the state shape and simple setters.
 */
export function makeCommentsActions(
    doc: Y.Doc,
    currentUser: User,
    set: StoreApi<CommentsState>['setState'],
    get: StoreApi<CommentsState>['getState'],
) {
    const map = (): Y.Map<CommentThread> => getThreadMap(doc);
    const getThread = (id: string) => map().get(id);

    return {
        submitInitialBody: (threadId: string) => {
            const text = get().initialDraft.trim();
            if (!text) return;
            doc.transact(() => {
                const thread = getThread(threadId);
                if (!thread) return;
                map().set(threadId, { ...thread, body: text });
            });
            set({ initialDraft: '' });
        },

        submitReply: (threadId: string) => {
            const text = (get().replyDrafts[threadId] ?? '').trim();
            if (!text) return;
            doc.transact(() => {
                const thread = getThread(threadId);
                if (!thread) return;
                const reply: CommentReply = {
                    id: makeId(),
                    authorId: currentUser.id,
                    authorName: currentUser.name,
                    authorRole: currentUser.role,
                    authorColor: currentUser.color,
                    body: text,
                    createdAt: Date.now(),
                };
                map().set(threadId, { ...thread, replies: [...thread.replies, reply] });
            });
            set((s) => ({ replyDrafts: { ...s.replyDrafts, [threadId]: '' } }));
        },

        editSubmit: () => {
            const { editTarget, editText } = get();
            if (!editTarget || !editText.trim()) return;
            const body = editText.trim();
            doc.transact(() => {
                switch (editTarget.kind) {
                    case 'thread': {
                        const thread = getThread(editTarget.threadId);
                        if (!thread) return;
                        map().set(editTarget.threadId, {
                            ...thread,
                            body,
                            edited: Date.now(),
                        });
                        return;
                    }
                    case 'reply': {
                        const thread = getThread(editTarget.threadId);
                        if (!thread) return;
                        const replies = thread.replies.map((r) =>
                            r.id === editTarget.replyId
                                ? { ...r, body, edited: Date.now() }
                                : r,
                        );
                        map().set(editTarget.threadId, { ...thread, replies });
                        return;
                    }
                    default:
                        assertNever(editTarget);
                }
            });
            set({ editTarget: null, editText: '' });
        },

        resolveThread: (threadId: string) => {
            doc.transact(() => {
                const thread = getThread(threadId);
                if (!thread) return;
                map().set(threadId, {
                    ...thread,
                    status: CommentStatus.Resolved,
                    resolvedBy: currentUser.name,
                    resolvedAt: Date.now(),
                });
            });
        },

        reopenThread: (threadId: string) => {
            doc.transact(() => {
                const thread = getThread(threadId);
                if (!thread) return;
                map().set(threadId, {
                    ...thread,
                    status: CommentStatus.Open,
                    resolvedBy: undefined,
                    resolvedAt: undefined,
                });
            });
        },

        removeThread: (threadId: string) => {
            doc.transact(() => {
                map().delete(threadId);
            });
        },

        removeReply: (threadId: string, replyId: string) => {
            doc.transact(() => {
                const thread = getThread(threadId);
                if (!thread) return;
                const replies = thread.replies.filter((r) => r.id !== replyId);
                if (replies.length === thread.replies.length) return;
                map().set(threadId, { ...thread, replies });
            });
            const { editTarget } = get();
            if (
                editTarget?.kind === 'reply'
                && editTarget.threadId === threadId
                && editTarget.replyId === replyId
            ) {
                set({ editTarget: null, editText: '' });
            }
        },

        createThread: (anchor: { id: string; quote: string }, body: string): string => {
            const thread: CommentThread = {
                id: anchor.id,
                authorId: currentUser.id,
                authorName: currentUser.name,
                authorRole: currentUser.role,
                authorColor: currentUser.color,
                targetRole: null,
                body: body.trim(),
                originalQuote: anchor.quote,
                createdAt: Date.now(),
                status: CommentStatus.Open,
                replies: [],
            };
            doc.transact(() => {
                map().set(anchor.id, thread);
            });
            return anchor.id;
        },

        toggleThreadReaction: (threadId: string, emoji: string) => {
            doc.transact(() => {
                const thread = getThread(threadId);
                if (!thread) return;
                map().set(threadId, {
                    ...thread,
                    reactions: toggleEmojiPresence(thread.reactions, emoji, currentUser.id),
                });
            });
        },

        toggleReplyReaction: (threadId: string, replyId: string, emoji: string) => {
            doc.transact(() => {
                const thread = getThread(threadId);
                if (!thread) return;
                const replies = thread.replies.map((r) =>
                    r.id !== replyId
                        ? r
                        : { ...r, reactions: toggleEmojiPresence(r.reactions, emoji, currentUser.id) },
                );
                map().set(threadId, { ...thread, replies });
            });
        },

        markOrphan: (threadId: string, lastKnownQuote: string) => {
            doc.transact(() => {
                const thread = getThread(threadId);
                if (!thread || thread.status !== CommentStatus.Open) return;
                const orphan: OrphanMetadata = {
                    orphanedAt: Date.now(),
                    lastKnownQuote,
                    lastKnownAuthorId: thread.authorId,
                };
                map().set(threadId, { ...thread, status: CommentStatus.Orphan, orphan });
            });
        },

        reattachThread: (threadId: string) => {
            doc.transact(() => {
                const thread = getThread(threadId);
                if (!thread) return;
                map().set(threadId, {
                    ...thread,
                    status: CommentStatus.Open,
                    orphan: undefined,
                });
            });
        },

        // Reserved for queued ops drained from `useSession.consumePendingComment()`
        // (T-54). No-op for now; the existing `pendingNew` effect in
        // `CommentsSidebar` still owns flushing until that wave lands.
        flushPending: () => undefined,
    };
}
