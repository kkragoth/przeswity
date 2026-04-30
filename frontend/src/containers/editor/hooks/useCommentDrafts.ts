import { useState } from 'react';

export type CommentEditTarget =
    | { kind: 'thread'; threadId: string }
    | { kind: 'reply'; threadId: string; replyId: string }
    | null;

export function useCommentDrafts() {
    const [draft, setDraft] = useState('');
    const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
    const [editTarget, setEditTarget] = useState<CommentEditTarget>(null);
    const [editText, setEditText] = useState('');

    const beginEdit = (target: Exclude<CommentEditTarget, null>, initial: string) => {
        setEditTarget(target);
        setEditText(initial);
    };

    const cancelEdit = () => {
        setEditTarget(null);
        setEditText('');
    };

    return {
        draft,
        setDraft,
        replyDrafts,
        setReplyDraft: (threadId: string, value: string) =>
            setReplyDrafts((prev) => ({ ...prev, [threadId]: value })),
        clearReplyDraft: (threadId: string) =>
            setReplyDrafts((prev) => ({ ...prev, [threadId]: '' })),
        editTarget,
        editText,
        setEditText,
        beginEdit,
        cancelEdit,
    };
}
