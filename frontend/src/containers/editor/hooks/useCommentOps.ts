import { useMemo } from 'react';
import type * as Y from 'yjs';
import { getThreadMap } from '@/editor/comments/threadOps';
import { CommentStatus, type CommentReply, type CommentThread } from '@/editor/comments/types';
import { toggleEmojiPresence } from '@/editor/comments/reactions';
import { makeId } from '@/editor/utils';
import type { User } from '@/editor/identity/types';
import { assertNever } from '@/lib/assert';

export type ReactionTarget =
    | { kind: 'thread'; threadId: string }
    | { kind: 'reply'; threadId: string; replyId: string };

export function createCommentOps(doc: Y.Doc, currentUser: User) {
    const map = () => getThreadMap(doc);
    const get = (threadId: string) => map().get(threadId);

    return {
        resolve(threadId: string) {
            const thread = get(threadId);
            if (!thread) return;
            map().set(threadId, { ...thread, status: CommentStatus.Resolved, resolvedBy: currentUser.name, resolvedAt: Date.now() });
        },
        reopen(threadId: string) {
            const thread = get(threadId);
            if (!thread) return;
            map().set(threadId, { ...thread, status: CommentStatus.Open, resolvedBy: undefined, resolvedAt: undefined });
        },
        remove(threadId: string) {
            map().delete(threadId);
        },
        toggleReaction(target: ReactionTarget, emoji: string) {
            switch (target.kind) {
                case 'thread': {
                    const thread = get(target.threadId);
                    if (!thread) return;
                    map().set(target.threadId, {
                        ...thread,
                        reactions: toggleEmojiPresence(thread.reactions, emoji, currentUser.id),
                    });
                    break;
                }
                case 'reply': {
                    const thread = get(target.threadId);
                    if (!thread) return;
                    const replies = thread.replies.map((reply) =>
                        reply.id !== target.replyId ? reply : {
                            ...reply,
                            reactions: toggleEmojiPresence(reply.reactions, emoji, currentUser.id),
                        },
                    );
                    map().set(target.threadId, { ...thread, replies });
                    break;
                }
                default:
                    assertNever(target);
            }
        },
        addReply(threadId: string, body: string): string {
            const thread = get(threadId);
            const replyId = makeId();
            if (!thread) return replyId;
            const reply: CommentReply = {
                id: replyId,
                authorId: currentUser.id,
                authorName: currentUser.name,
                authorRole: currentUser.role,
                authorColor: currentUser.color,
                body: body.trim(),
                createdAt: Date.now(),
            };
            map().set(threadId, { ...thread, replies: [...thread.replies, reply] });
            return replyId;
        },
        editThread(threadId: string, body: string) {
            const thread = get(threadId);
            if (!thread) return;
            map().set(threadId, { ...thread, body: body.trim(), edited: Date.now() });
        },
        setThreadBody(threadId: string, body: string) {
            const thread = get(threadId);
            if (!thread) return;
            map().set(threadId, { ...thread, body: body.trim() });
        },
        editReply(threadId: string, replyId: string, body: string) {
            const thread = get(threadId);
            if (!thread) return;
            const replies = thread.replies.map((reply) =>
                reply.id === replyId ? { ...reply, body: body.trim(), edited: Date.now() } : reply,
            );
            map().set(threadId, { ...thread, replies });
        },
        createThread(anchor: { id: string; quote: string }, body: string): string {
            const id = anchor.id;
            const thread: CommentThread = {
                id,
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
            map().set(id, thread);
            return id;
        },
    };
}

export function useCommentOps(doc: Y.Doc, currentUser: User) {
    return useMemo(
        () => createCommentOps(doc, currentUser),
        [doc, currentUser],
    );
}
