// @vitest-environment jsdom
/**
 * T-05 regression net for the editor's comment lifecycle.
 *
 * Mounts the real `CommentsSidebar` against a real Yjs document and walks
 * the seven golden-path scenarios from T-65:
 *   1. Open a session (sidebar mounts, empty state).
 *   2. Create a single comment on a selection (pendingNew → setThreadBody).
 *   3. Reply to that comment.
 *   4. Edit the reply.
 *   5. Resolve the thread.
 *   6. Reopen / restore.
 *   7. Delete the thread.
 *
 * The TipTap editor is `null` for this suite — comment state lives in the
 * y-doc, which the sidebar mutates through the same code paths used in
 * production. This locks observable behavior so subsequent state-management
 * waves can be compared 1:1.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, opts?: Record<string, unknown>) => {
            if (opts && 'count' in opts) return `${key}:${String(opts.count)}`;
            if (opts && 'name' in opts) return `${key}:${String(opts.name)}`;
            return key;
        },
        i18n: { language: 'en' },
    }),
}));

vi.mock('@/components/feedback/useConfirmDialog', () => ({
    useConfirmDialog: () => ({
        confirm: () => Promise.resolve(true),
        dialogState: null,
        onConfirm: () => {},
        onCancel: () => {},
    }),
}));

import {
    mountCommentSidebar,
    typeIntoTextarea,
    click,
    flush,
    findByExactText,
    findButtonContaining,
    type CommentHarness,
} from '@/containers/editor/__tests__/helpers/commentHarness';
import { getThreadMap } from '@/editor/comments/threadOps';
import { CommentStatus } from '@/editor/comments/types';

const submitInitialBody = async (h: CommentHarness, body: string) => {
    const draft = h.host.querySelector('textarea') as HTMLTextAreaElement;
    expect(draft).toBeTruthy();
    await typeIntoTextarea(draft, body);
    const post = findButtonContaining(h.host, 'comments.post');
    expect(post).toBeTruthy();
    await click(post!);
};

let h: CommentHarness;
beforeEach(() => { h = mountCommentSidebar(); });
afterEach(() => h.unmount());

describe('editor regression — comment golden path', () => {
    it('1. mounts an empty sidebar with the editor namespace title', () => {
        expect(h.host.textContent).toContain('comments.tabs.comments');
        expect(h.host.textContent).toContain('comments.empty');
    });

    it('2. creates a comment on a selection (pendingNew round-trip)', async () => {
        await h.setPendingNew({ id: 't1', quote: 'hello world' });
        expect(getThreadMap(h.doc).get('t1')).toBeDefined();
        await submitInitialBody(h, 'first comment body');
        expect(getThreadMap(h.doc).get('t1')?.body).toBe('first comment body');
    });

    it('3. replies to the comment', async () => {
        await h.setPendingNew({ id: 't2', quote: 'q' });
        await submitInitialBody(h, 'body');

        const replyBox = h.host.querySelector('.thread-reply-compose textarea') as HTMLTextAreaElement;
        expect(replyBox).toBeTruthy();
        await typeIntoTextarea(replyBox, 'a reply');
        const sendBtn = h.host.querySelector('.thread-reply-compose .btn-send') as HTMLButtonElement;
        expect(sendBtn).toBeTruthy();
        await click(sendBtn);

        const thread = getThreadMap(h.doc).get('t2')!;
        expect(thread.replies.length).toBe(1);
        expect(thread.replies[0].body).toBe('a reply');
    });

    it('4. edits the reply', async () => {
        await h.setPendingNew({ id: 't3', quote: 'q' });
        await submitInitialBody(h, 'body');
        const replyBox = h.host.querySelector('.thread-reply-compose textarea') as HTMLTextAreaElement;
        await typeIntoTextarea(replyBox, 'orig reply');
        await click(h.host.querySelector('.thread-reply-compose .btn-send') as HTMLButtonElement);

        const editPencil = h.host.querySelector('.thread-reply .thread-edit-btn') as HTMLButtonElement;
        expect(editPencil).toBeTruthy();
        await click(editPencil);

        const editInput = h.host.querySelector('.thread-reply textarea') as HTMLTextAreaElement;
        expect(editInput).toBeTruthy();
        await typeIntoTextarea(editInput, 'edited reply');
        const submit = findButtonContaining(h.host.querySelector('.thread-reply') as HTMLElement, 'comments.post');
        expect(submit).toBeTruthy();
        await click(submit!);

        const reply = getThreadMap(h.doc).get('t3')!.replies[0];
        expect(reply.body).toBe('edited reply');
        expect(reply.edited).toBeGreaterThan(0);
    });

    it('5. resolves the thread', async () => {
        await h.setPendingNew({ id: 't4', quote: 'q' });
        await submitInitialBody(h, 'body');

        const resolve = h.host.querySelector('.btn-resolve') as HTMLButtonElement;
        expect(resolve).toBeTruthy();
        await click(resolve);
        expect(getThreadMap(h.doc).get('t4')?.status).toBe(CommentStatus.Resolved);
    });

    it('6. reopens (restores) a resolved thread', async () => {
        await h.setPendingNew({ id: 't5', quote: 'q' });
        await submitInitialBody(h, 'body');
        await click(h.host.querySelector('.btn-resolve') as HTMLButtonElement);

        const filterAll = findByExactText(h.host, 'comments.filter.all');
        expect(filterAll).toBeTruthy();
        await click(filterAll!);

        const reopen = findButtonContaining(h.host, 'comments.reopen');
        expect(reopen).toBeTruthy();
        await click(reopen!);
        expect(getThreadMap(h.doc).get('t5')?.status).toBe(CommentStatus.Open);
    });

    it('resolving the active thread clears activeCommentId (cross-store invariant)', async () => {
        await h.setPendingNew({ id: 't-active', quote: 'q' });
        await submitInitialBody(h, 'body');
        // pendingNew flow sets the just-created thread as active.
        expect(h.getActiveCommentId()).toBe('t-active');

        const resolve = h.host.querySelector('.btn-resolve') as HTMLButtonElement;
        expect(resolve).toBeTruthy();
        await click(resolve);

        expect(getThreadMap(h.doc).get('t-active')?.status).toBe(CommentStatus.Resolved);
        expect(h.getActiveCommentId()).toBeNull();
    });

    it('7. deletes a resolved thread', async () => {
        await h.setPendingNew({ id: 't6', quote: 'q' });
        await submitInitialBody(h, 'body');
        await click(h.host.querySelector('.btn-resolve') as HTMLButtonElement);

        const filterAll = findByExactText(h.host, 'comments.filter.all');
        await click(filterAll!);

        const trash = h.host.querySelector('.thread.is-resolved .thread-remove') as HTMLButtonElement;
        expect(trash).toBeTruthy();
        await click(trash);
        await flush(); // useConfirmDialog mock auto-resolves; flush microtask.
        expect(getThreadMap(h.doc).get('t6')).toBeUndefined();
    });
});
