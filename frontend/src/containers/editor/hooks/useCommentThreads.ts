import { useMemo, useState } from 'react';
import type { CommentThread } from '@/editor/comments/types';
import type { User } from '@/editor/identity/types';

export enum CommentStatusFilter {
    All = 'all',
    Open = 'open',
    Resolved = 'resolved',
    Mine = 'mine',
}

export function useCommentThreads(threads: CommentThread[], currentUser: User) {
    const [filter, setFilter] = useState<CommentStatusFilter>(CommentStatusFilter.Open);

    const visible = useMemo(() => {
        const base = [...threads].sort((a, b) => a.createdAt - b.createdAt);
        if (filter === CommentStatusFilter.All) return base;
        if (filter === CommentStatusFilter.Open) return base.filter((thread) => thread.status === 'open');
        if (filter === CommentStatusFilter.Resolved) return base.filter((thread) => thread.status === 'resolved');
        return base.filter((thread) =>
            thread.authorId === currentUser.id || thread.replies.some((reply) => reply.authorId === currentUser.id),
        );
    }, [threads, filter, currentUser.id]);

    return { visible, filter, setFilter };
}
