/**
 * T-53 — regression guard: every composed action must produce exactly ONE
 * y-doc event from the comments map's perspective. The wrapper is
 * `doc.transact(...)`; without it, multi-step mutations fan out one event
 * per `map.set()` call and downstream observers re-render N times.
 */
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

import { createCommentsStore } from '@/containers/editor/stores/createCommentsStore';
import { getThreadMap } from '@/editor/comments/threadOps';
import { CommentStatus } from '@/editor/comments/types';
import { Role, type User } from '@/editor/identity/types';

const fakeUser: User = {
    id: 'u1',
    name: 'User One',
    color: '#abcdef',
    role: Role.Editor,
};

interface Harness {
    doc: Y.Doc;
    store: ReturnType<typeof createCommentsStore>;
    eventCount: () => number;
    resetEvents: () => void;
}

function setupHarness(): Harness {
    const doc = new Y.Doc();
    const store = createCommentsStore(doc, fakeUser);
    let count = 0;
    getThreadMap(doc).observeDeep(() => {
        count += 1;
    });
    return {
        doc,
        store,
        eventCount: () => count,
        resetEvents: () => {
            count = 0;
        },
    };
}

function seedThread(h: Harness, id = 't1', body = 'initial body'): string {
    h.store.getState().createThread({ id, quote: 'quote' }, body);
    h.resetEvents();
    return id;
}

describe('createCommentsStore — single transact event per composed action', () => {
    it('createThread emits exactly one event', () => {
        const h = setupHarness();
        h.store.getState().createThread({ id: 't1', quote: 'q' }, 'body');
        expect(h.eventCount()).toBe(1);
    });

    it('submitInitialBody emits exactly one event and clears initialDraft', () => {
        const h = setupHarness();
        const id = seedThread(h, 't1', '');
        h.store.getState().setInitialDraft('hello world');

        h.store.getState().submitInitialBody(id);

        expect(h.eventCount()).toBe(1);
        expect(h.store.getState().initialDraft).toBe('');
        expect(getThreadMap(h.doc).get(id)?.body).toBe('hello world');
    });

    it('submitInitialBody is a no-op when draft is empty', () => {
        const h = setupHarness();
        const id = seedThread(h);
        h.store.getState().setInitialDraft('   ');
        h.store.getState().submitInitialBody(id);
        expect(h.eventCount()).toBe(0);
    });

    it('submitReply emits exactly one event and clears that thread\'s reply draft', () => {
        const h = setupHarness();
        const id = seedThread(h);
        h.store.getState().setReplyDraft(id, 'first reply');

        h.store.getState().submitReply(id);

        expect(h.eventCount()).toBe(1);
        expect(h.store.getState().replyDrafts[id]).toBe('');
        const thread = getThreadMap(h.doc).get(id);
        expect(thread?.replies).toHaveLength(1);
        expect(thread?.replies[0].body).toBe('first reply');
    });

    it('editSubmit on a thread emits exactly one event', () => {
        const h = setupHarness();
        const id = seedThread(h);
        h.store.getState().beginEdit({ kind: 'thread', threadId: id }, 'edited body');

        h.store.getState().editSubmit();

        expect(h.eventCount()).toBe(1);
        expect(getThreadMap(h.doc).get(id)?.body).toBe('edited body');
        expect(h.store.getState().editTarget).toBeNull();
        expect(h.store.getState().editText).toBe('');
    });

    it('editSubmit on a reply emits exactly one event', () => {
        const h = setupHarness();
        const id = seedThread(h);
        h.store.getState().setReplyDraft(id, 'reply');
        h.store.getState().submitReply(id);
        const replyId = getThreadMap(h.doc).get(id)!.replies[0].id;
        h.resetEvents();

        h.store.getState().beginEdit({ kind: 'reply', threadId: id, replyId }, 'edited reply');
        h.store.getState().editSubmit();

        expect(h.eventCount()).toBe(1);
        expect(getThreadMap(h.doc).get(id)?.replies[0].body).toBe('edited reply');
        expect(h.store.getState().editTarget).toBeNull();
    });

    it('resolveThread emits exactly one event', () => {
        const h = setupHarness();
        const id = seedThread(h);
        h.store.getState().resolveThread(id);
        expect(h.eventCount()).toBe(1);
        expect(getThreadMap(h.doc).get(id)?.status).toBe(CommentStatus.Resolved);
    });

    it('reopenThread emits exactly one event', () => {
        const h = setupHarness();
        const id = seedThread(h);
        h.store.getState().resolveThread(id);
        h.resetEvents();
        h.store.getState().reopenThread(id);
        expect(h.eventCount()).toBe(1);
        expect(getThreadMap(h.doc).get(id)?.status).toBe(CommentStatus.Open);
    });

    it('removeThread emits exactly one event', () => {
        const h = setupHarness();
        const id = seedThread(h);
        h.store.getState().removeThread(id);
        expect(h.eventCount()).toBe(1);
        expect(getThreadMap(h.doc).get(id)).toBeUndefined();
    });

    it('toggleThreadReaction emits exactly one event', () => {
        const h = setupHarness();
        const id = seedThread(h);
        h.store.getState().toggleThreadReaction(id, '👍');
        expect(h.eventCount()).toBe(1);
        expect(getThreadMap(h.doc).get(id)?.reactions?.['👍']).toContain('u1');
    });

    it('toggleReplyReaction emits exactly one event', () => {
        const h = setupHarness();
        const id = seedThread(h);
        h.store.getState().setReplyDraft(id, 'reply');
        h.store.getState().submitReply(id);
        const replyId = getThreadMap(h.doc).get(id)!.replies[0].id;
        h.resetEvents();

        h.store.getState().toggleReplyReaction(id, replyId, '🎉');

        expect(h.eventCount()).toBe(1);
        const reply = getThreadMap(h.doc).get(id)?.replies[0];
        expect(reply?.reactions?.['🎉']).toContain('u1');
    });

    it('flushPending is a no-op (reserved stub)', () => {
        const h = setupHarness();
        h.store.getState().flushPending();
        expect(h.eventCount()).toBe(0);
    });

    it('draft round-trip: setInitialDraft / setReplyDraft / clearReplyDraft', () => {
        const h = setupHarness();
        h.store.getState().setInitialDraft('hello');
        expect(h.store.getState().initialDraft).toBe('hello');

        h.store.getState().setReplyDraft('id1', 'hi');
        expect(h.store.getState().replyDrafts.id1).toBe('hi');

        h.store.getState().clearReplyDraft('id1');
        // empty-equivalent: '' or undefined are both acceptable.
        expect(h.store.getState().replyDrafts.id1 || '').toBe('');

        // Pure UI-state mutations must NOT touch the y-doc.
        expect(h.eventCount()).toBe(0);
    });

    it('beginEdit then cancelEdit clears editTarget and editText', () => {
        const h = setupHarness();
        h.store.getState().beginEdit({ kind: 'thread', threadId: 't1' }, 'old body');
        expect(h.store.getState().editTarget).toEqual({ kind: 'thread', threadId: 't1' });
        expect(h.store.getState().editText).toBe('old body');

        h.store.getState().cancelEdit();
        expect(h.store.getState().editTarget).toBeNull();
        expect(h.store.getState().editText).toBe('');
    });

    // Cross-store invariant note: "resolve clears the active comment" lives
    // across the (session, comments) boundary — `setActiveComment(null)` is
    // the caller's responsibility (see ThreadHeader.handleResolve). The
    // editorRegression test asserts that observable behavior end-to-end.

    it('two factory calls produce isolated stores', () => {
        const docA = new Y.Doc();
        const docB = new Y.Doc();
        const a = createCommentsStore(docA, fakeUser);
        const b = createCommentsStore(docB, fakeUser);

        a.getState().setInitialDraft('A draft');
        a.getState().setReplyDraft('t1', 'A reply');

        expect(b.getState().initialDraft).toBe('');
        expect(b.getState().replyDrafts.t1).toBeUndefined();
    });
});
