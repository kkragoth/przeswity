import { useMemo } from 'react';
import type * as Y from 'yjs';
import { getThreadMap } from '@/editor/comments/threadOps';
import type { CommentReply, CommentThread } from '@/editor/comments/types';
import { makeId } from '@/editor/utils';
import type { User } from '@/editor/identity/types';

export function createCommentOps(doc: Y.Doc, currentUser: User) {
    const map = () => getThreadMap(doc);
    const get = (threadId: string) => map().get(threadId);

    return {
        resolve(threadId: string) {
            const thread = get(threadId);
            if (!thread) return;
            map().set(threadId, { ...thread, status: 'resolved', resolvedBy: currentUser.name, resolvedAt: Date.now() });
        },
        reopen(threadId: string) {
            const thread = get(threadId);
            if (!thread) return;
            map().set(threadId, { ...thread, status: 'open', resolvedBy: undefined, resolvedAt: undefined });
        },
        remove(threadId: string) {
            map().delete(threadId);
        },
        toggleReaction(threadId: string, emoji: string) {
            const thread = get(threadId);
            if (!thread) return;
            const next = { ...(thread.reactions ?? {}) };
            const ids = new Set(next[emoji] ?? []);
            if (ids.has(currentUser.id)) ids.delete(currentUser.id);
            else ids.add(currentUser.id);
            if (ids.size === 0) delete next[emoji];
            else next[emoji] = [...ids];
            map().set(threadId, { ...thread, reactions: next });
        },
        toggleReplyReaction(threadId: string, replyId: string, emoji: string) {
            const thread = get(threadId);
            if (!thread) return;
            const replies = thread.replies.map((reply) => {
                if (reply.id !== replyId) return reply;
                const next = { ...(reply.reactions ?? {}) };
                const ids = new Set(next[emoji] ?? []);
                if (ids.has(currentUser.id)) ids.delete(currentUser.id);
                else ids.add(currentUser.id);
                if (ids.size === 0) delete next[emoji];
                else next[emoji] = [...ids];
                return { ...reply, reactions: next };
            });
            map().set(threadId, { ...thread, replies });
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
                status: 'open',
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
