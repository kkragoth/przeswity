/**
 * Tests for the callback logic in useCommentCallbacks.
 * Exercises the ops integration through createCommentOps directly,
 * since useCommentCallbacks is a thin wiring of stable callbacks over ops.
 */
import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { createCommentOps } from '@/containers/editor/hooks/useCommentOps';
import { getThreadMap } from '@/editor/comments/threadOps';
import { Role, type User } from '@/editor/identity/types';
import { CommentStatus } from '@/editor/comments/types';

const user: User = { id: 'u1', name: 'User One', role: Role.Editor, color: '#111' };

describe('useCommentCallbacks — ops integration', () => {
    it('resolve + reopen round-trip preserves thread body', () => {
        const doc = new Y.Doc();
        const ops = createCommentOps(doc, user);
        const id = ops.createThread({ id: 't1', quote: 'Q' }, 'Body');
        ops.resolve(id);
        ops.reopen(id);
        const thread = getThreadMap(doc).get(id);
        expect(thread?.status).toBe(CommentStatus.Open);
        expect(thread?.body).toBe('Body');
    });

    it('double toggleReaction removes the emoji', () => {
        const doc = new Y.Doc();
        const ops = createCommentOps(doc, user);
        const id = ops.createThread({ id: 't2', quote: 'Q' }, 'Body');
        ops.toggleReaction({ kind: 'thread', threadId: id }, '👍');
        ops.toggleReaction({ kind: 'thread', threadId: id }, '👍');
        const thread = getThreadMap(doc).get(id);
        expect(thread?.reactions?.['👍']).toBeUndefined();
    });

    it('reply reaction can be toggled independently of thread reaction', () => {
        const doc = new Y.Doc();
        const ops = createCommentOps(doc, user);
        const id = ops.createThread({ id: 't3', quote: 'Q' }, 'Body');
        const replyId = ops.addReply(id, 'Reply');
        ops.toggleReaction({ kind: 'reply', threadId: id, replyId }, '❤️');
        const thread = getThreadMap(doc).get(id);
        expect(thread?.replies[0]?.reactions?.['❤️']).toContain('u1');
    });
});
