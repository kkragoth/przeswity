import type { CommentThread } from '@/editor/comments/types';
import type { SuggestionEntry } from '@/containers/editor/suggestions/components/SuggestionItem';

export enum ThreadKind {
    Comment = 'comment',
    Suggestion = 'suggestion',
}

export enum ThreadFilterKind {
    All = 'all',
    Open = 'open',
    Resolved = 'resolved',
    SuggestionsOnly = 'suggestionsOnly',
    Mine = 'mine',
}

export type UnifiedThread =
    | { kind: ThreadKind.Comment; docPos: number; thread: CommentThread }
    | { kind: ThreadKind.Suggestion; docPos: number; entry: SuggestionEntry };

export function unifiedThreadId(t: UnifiedThread): string {
    return t.kind === ThreadKind.Comment ? t.thread.id : t.entry.suggestionId;
}
