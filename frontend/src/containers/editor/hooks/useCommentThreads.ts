import { useMemo, useState } from 'react';
import { CommentStatus, type CommentThread } from '@/editor/comments/types';
import type { Role, User } from '@/editor/identity/types';

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

const DEFAULT_FILTER: CommentFilterState = {
    status: CommentStatusFilter.Open,
    author: '',
    role: '',
};

function threadInvolvesAuthor(thread: CommentThread, name: string): boolean {
    return thread.authorName === name || thread.replies.some((r) => r.authorName === name);
}

function threadInvolvesRole(thread: CommentThread, role: Role): boolean {
    return thread.authorRole === role || thread.replies.some((r) => r.authorRole === role);
}

function matchesStatus(thread: CommentThread, status: CommentStatusFilter, currentUser: User): boolean {
    if (status === CommentStatusFilter.All) return true;
    if (status === CommentStatusFilter.Open) return thread.status === CommentStatus.Open;
    if (status === CommentStatusFilter.Resolved) return thread.status === CommentStatus.Resolved;
    return thread.authorId === currentUser.id || thread.replies.some((r) => r.authorId === currentUser.id);
}

export function useCommentThreads(threads: CommentThread[], currentUser: User) {
    const [filter, setFilter] = useState<CommentFilterState>(DEFAULT_FILTER);

    const setStatus = (status: CommentStatusFilter) => setFilter((prev) => ({ ...prev, status }));
    const setAuthor = (author: string) => setFilter((prev) => ({ ...prev, author }));
    const setRole = (role: Role | '') => setFilter((prev) => ({ ...prev, role }));

    const allAuthors = useMemo(() => {
        const set = new Set<string>();
        for (const t of threads) {
            set.add(t.authorName);
            for (const r of t.replies) set.add(r.authorName);
        }
        return [...set].sort();
    }, [threads]);

    const { visible, open, resolved } = useMemo(() => {
        const sorted = [...threads].sort((a, b) => a.createdAt - b.createdAt);
        const v = sorted.filter((thread) => {
            if (!matchesStatus(thread, filter.status, currentUser)) return false;
            if (filter.author && !threadInvolvesAuthor(thread, filter.author)) return false;
            if (filter.role && !threadInvolvesRole(thread, filter.role as Role)) return false;
            return true;
        });
        const o: CommentThread[] = [];
        const r: CommentThread[] = [];
        for (const th of v) {
            if (th.status === CommentStatus.Open) o.push(th);
            else r.push(th);
        }
        return { visible: v, open: o, resolved: r };
    }, [threads, filter, currentUser]);

    return { visible, open, resolved, filter, setStatus, setAuthor, setRole, allAuthors };
}
