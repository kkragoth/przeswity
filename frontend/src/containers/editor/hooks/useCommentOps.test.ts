import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { createCommentOps } from '@/containers/editor/hooks/useCommentOps';
import { getThreadMap } from '@/editor/comments/threadOps';
import type { User } from '@/editor/identity/types';

const user: User = {
    id: 'u1',
    name: 'User One',
    role: 'editor',
    color: '#111111',
};

describe('useCommentOps', () => {
    it('mutates Yjs thread map for lifecycle operations', () => {
        const doc = new Y.Doc();
        const ops = createCommentOps(doc, user);

        const threadId = ops.createThread({ id: 't1', quote: 'Quote' }, 'Body');
        const replyId = ops.addReply(threadId, 'Reply');
        ops.editReply(threadId, replyId, 'Reply edited');
        ops.toggleReaction(threadId, '👍');
        ops.resolve(threadId);
        ops.reopen(threadId);

        const thread = getThreadMap(doc).get(threadId);
        expect(thread?.body).toBe('Body');
        expect(thread?.status).toBe('open');
        expect(thread?.reactions?.['👍']).toContain('u1');
        expect(thread?.replies[0]?.body).toBe('Reply edited');

        ops.toggleReaction(threadId, '👍');
        ops.remove(threadId);
        expect(getThreadMap(doc).get(threadId)).toBeUndefined();
    });
});
