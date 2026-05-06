import * as Y from 'yjs';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { Role, User } from '@/editor/identity/types';

import { makeCommentsActions } from './commentsActions';

/**
 * Wave 4 / T-50–T-53 — per-session comments store factory.
 *
 * State shape, simple setters, and the factory entry point. The composed
 * mutator actions (those that wrap `doc.transact`) live in
 * `commentsActions.ts` so the invariant — every multi-step y-doc write goes
 * through `doc.transact` — stays visually grouped and reviewable.
 *
 * Thread DATA itself lives in the y-doc (via `getThreadMap(doc)`) and is
 * surfaced separately by `useCommentThreads(doc)`; this store does NOT mirror it.
 */

export enum CommentStatusFilter {
    All = 'all',
    Open = 'open',
    Resolved = 'resolved',
    Mine = 'mine',
    Orphan = 'orphan',
}

export interface CommentFilterState {
    status: CommentStatusFilter;
    authorId: string;
    role: Role | '';
}

export type CommentEditTarget =
    | { kind: 'thread'; threadId: string }
    | { kind: 'reply'; threadId: string; replyId: string }
    | null;

const DEFAULT_FILTER: CommentFilterState = {
    status: CommentStatusFilter.Open,
    authorId: '',
    role: '',
};

export interface CommentsState {
    filter: CommentFilterState;
    initialDraft: string;
    replyDrafts: Record<string, string>;
    editTarget: CommentEditTarget;
    editText: string;

    setStatus(status: CommentStatusFilter): void;
    setAuthorId(authorId: string): void;
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
    markOrphan(threadId: string, lastKnownQuote: string): void;
    reattachThread(threadId: string): void;
    flushPending(): void;
}

export type CommentsStore = StoreApi<CommentsState>;

export const createCommentsStore = (doc: Y.Doc, currentUser: User): CommentsStore =>
    createStore<CommentsState>()((set, get) => ({
        filter: { ...DEFAULT_FILTER },
        initialDraft: '',
        replyDrafts: {},
        editTarget: null,
        editText: '',

        setStatus: (status) => set((s) => ({ filter: { ...s.filter, status } })),
        setAuthorId: (authorId) => set((s) => ({ filter: { ...s.filter, authorId } })),
        setRole: (role) => set((s) => ({ filter: { ...s.filter, role } })),

        setInitialDraft: (v) => set({ initialDraft: v }),
        setReplyDraft: (threadId, v) =>
            set((s) => ({ replyDrafts: { ...s.replyDrafts, [threadId]: v } })),
        clearReplyDraft: (threadId) =>
            set((s) => ({ replyDrafts: { ...s.replyDrafts, [threadId]: '' } })),
        setEditText: (v) => set({ editText: v }),
        beginEdit: (target, initial) => set({ editTarget: target, editText: initial }),
        cancelEdit: () => set({ editTarget: null, editText: '' }),

        ...makeCommentsActions(doc, currentUser, set, get),
    }));
