import * as Y from 'yjs';
import { createStore, type StoreApi } from 'zustand/vanilla';

import { getThreadMap } from '@/editor/comments/threadOps';
import { toggleEmojiPresence } from '@/editor/comments/reactions';
import {
    CommentStatus,
    type CommentReply,
    type CommentThread,
} from '@/editor/comments/types';
import type { Role, User } from '@/editor/identity/types';
import { makeId } from '@/editor/utils';
import { assertNever } from '@/lib/assert';

/**
 * Wave 4 / T-50–T-53 — per-session comments store factory.
 *
 * Owns transient comment-side UI state (filter, drafts, edit target) and the
 * composed mutator actions. Every action that touches the y-doc runs inside
 * a single `doc.transact(...)` so subscribers (`observeDeep`, `useCommentThreads`)
 * see exactly one logical event per user-facing operation, even when the
 * action also clears a draft (T-51).
 *
 * Thread DATA itself lives in the y-doc (via `getThreadMap(doc)`) and is
 * surfaced separately by `useCommentThreads(doc)`; this store does NOT mirror it.
 */

export enum CommentStatusFilter {
    All = 'all',
    Open = 'open',
    Resolved = 'resolved',
    Mine = 'mine',
}

export interface CommentFilterState {
    status: CommentStatusFilter;
    author: string;
    role: Role | '';
}

export type CommentEditTarget =
    | { kind: 'thread'; threadId: string }
    | { kind: 'reply'; threadId: string; replyId: string }
    | null;

const DEFAULT_FILTER: CommentFilterState = {
    status: CommentStatusFilter.Open,
    author: '',
    role: '',
};

export interface CommentsState {
    filter: CommentFilterState;
    initialDraft: string;
    replyDrafts: Record<string, string>;
    editTarget: CommentEditTarget;
    editText: string;

    setStatus(status: CommentStatusFilter): void;
    setAuthor(author: string): void;
    setRole(role: Role | ''): void;

    setInitialDraft(v: string): void;
    setReplyDraft(threadId: string, v: string): void;
    clearReplyDraft(threadId: string): void;
    setEditText(v: string): void;
    beginEdit(target: Exclude<CommentEditTarget, null>, initial: string): void;
    cancelEdit(): void;

    submitInitialBody(threadId: string): void;
    submitReply(threadId: string): void;
    editSubmit(): void;
    resolveThread(threadId: string): void;
    reopenThread(threadId: string): void;
    removeThread(threadId: string): void;
    createThread(anchor: { id: string; quote: string }, body: string): string;
    toggleThreadReaction(threadId: string, emoji: string): void;
    toggleReplyReaction(threadId: string, replyId: string, emoji: string): void;
    flushPending(): void;
}

export type CommentsStore = StoreApi<CommentsState>;

export const createCommentsStore = (doc: Y.Doc, currentUser: User): CommentsStore =>
    createStore<CommentsState>()((set, get) => {
        const map = (): Y.Map<CommentThread> => getThreadMap(doc);
        const getThread = (id: string) => map().get(id);

        return {
            filter: { ...DEFAULT_FILTER },
            initialDraft: '',
            replyDrafts: {},
            editTarget: null,
            editText: '',

            setStatus: (status) => set((s) => ({ filter: { ...s.filter, status } })),
            setAuthor: (author) => set((s) => ({ filter: { ...s.filter, author } })),
            setRole: (role) => set((s) => ({ filter: { ...s.filter, role } })),

            setInitialDraft: (v) => set({ initialDraft: v }),
            setReplyDraft: (threadId, v) =>
                set((s) => ({ replyDrafts: { ...s.replyDrafts, [threadId]: v } })),
            clearReplyDraft: (threadId) =>
                set((s) => ({ replyDrafts: { ...s.replyDrafts, [threadId]: '' } })),
            setEditText: (v) => set({ editText: v }),
            beginEdit: (target, initial) => set({ editTarget: target, editText: initial }),
            cancelEdit: () => set({ editTarget: null, editText: '' }),

            submitInitialBody: (threadId) => {
                const text = get().initialDraft.trim();
                if (!text) return;
                doc.transact(() => {
                    const thread = getThread(threadId);
                    if (!thread) return;
                    map().set(threadId, { ...thread, body: text });
                });
                set({ initialDraft: '' });
            },

            submitReply: (threadId) => {
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

            resolveThread: (threadId) => {
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

            reopenThread: (threadId) => {
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

            removeThread: (threadId) => {
                doc.transact(() => {
                    map().delete(threadId);
                });
            },

            createThread: (anchor, body) => {
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

            toggleThreadReaction: (threadId, emoji) => {
                doc.transact(() => {
                    const thread = getThread(threadId);
                    if (!thread) return;
                    map().set(threadId, {
                        ...thread,
                        reactions: toggleEmojiPresence(thread.reactions, emoji, currentUser.id),
                    });
                });
            },

            toggleReplyReaction: (threadId, replyId, emoji) => {
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

            // Reserved for queued ops drained from `useSession.consumePendingComment()`
            // (T-54). No-op for now; the existing `pendingNew` effect in
            // `CommentsSidebar` still owns flushing until that wave lands.
            flushPending: () => undefined,
        };
    });
