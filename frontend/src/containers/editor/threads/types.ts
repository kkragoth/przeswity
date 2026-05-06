import type { CommentThread } from '@/editor/comments/types';
import type { SuggestionEntry } from '@/containers/editor/suggestions/components/SuggestionItem';

export enum ThreadKind {
    Comment = 'comment',
    Suggestion = 'suggestion',
}

export enum ThreadStatusFilter {
    All = 'all',
    Open = 'open',
    Resolved = 'resolved',
}

export enum ThreadTypeFilter {
    All = 'all',
    Comments = 'comments',
    Suggestions = 'suggestions',
}

export enum ThreadSort {
    Position = 'position',
    Newest = 'newest',
    Oldest = 'oldest',
}

export type UnifiedThread =
    | { kind: ThreadKind.Comment; docPos: number; thread: CommentThread }
    | { kind: ThreadKind.Suggestion; docPos: number; entry: SuggestionEntry };

export function unifiedThreadId(t: UnifiedThread): string {
    return t.kind === ThreadKind.Comment ? t.thread.id : t.entry.suggestionId;
}

export function unifiedThreadTimestamp(t: UnifiedThread): number {
    return t.kind === ThreadKind.Comment ? t.thread.createdAt : t.entry.timestamp;
}

export function unifiedThreadAuthorId(t: UnifiedThread): string {
    return t.kind === ThreadKind.Comment ? t.thread.authorId : t.entry.authorId;
}
