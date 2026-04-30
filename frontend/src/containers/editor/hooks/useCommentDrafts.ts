import { useState } from 'react';

export type CommentEditBuffer =
    | { kind: 'thread'; threadId: string }
    | { kind: 'reply'; threadId: string; replyId: string }
    | null;

export function useCommentDrafts() {
    const [draft, setDraft] = useState('');
    const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
    const [editBuffer, setEditBuffer] = useState<CommentEditBuffer>(null);

    return {
        draft,
        setDraft,
        replyDrafts,
        setReplyDraft: (threadId: string, value: string) =>
            setReplyDrafts((prev) => ({ ...prev, [threadId]: value })),
        clearReplyDraft: (threadId: string) =>
            setReplyDrafts((prev) => ({ ...prev, [threadId]: '' })),
        editBuffer,
        beginEdit: (buffer: Exclude<CommentEditBuffer, null>) => setEditBuffer(buffer),
        cancelEdit: () => setEditBuffer(null),
    };
}
