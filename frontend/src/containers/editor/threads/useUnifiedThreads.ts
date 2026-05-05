import { useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import * as Y from 'yjs';
import { useCommentThreads } from '@/editor/comments/useCommentThreads';
import { CommentStatus } from '@/editor/comments/types';
import { SuggestionType } from '@/editor/suggestions/suggestionOps';
import { SuggestionEntryKind, type SuggestionEntry } from '@/containers/editor/suggestions/components/SuggestionItem';
import { ThreadKind, ThreadFilterKind, type UnifiedThread } from './types';
import type { User } from '@/editor/identity/types';

interface DocCollections {
    commentPositions: Map<string, number>;
    suggestions: SuggestionEntry[];
}

const EMPTY_DOC_COLLECTIONS: DocCollections = {
    commentPositions: new Map(),
    suggestions: [],
};

/**
 * Single-pass walk: collects both first-occurrence positions for comment marks
 * AND grouped insertion/deletion suggestion entries. Doing both in one
 * descendants traversal halves the cost compared to two separate walks per
 * doc change, and the result feeds two callers (sort key + sidebar list).
 */
function collectFromDoc(editor: Editor): DocCollections {
    const commentPositions = new Map<string, number>();
    const groups = new Map<string, {
        suggestionId: string; authorId: string; authorName: string;
        authorColor: string; timestamp: number;
        insertionText: string; insertionFrom: number; insertionTo: number;
        deletionText: string; deletionFrom: number; deletionTo: number;
        hasInsertion: boolean; hasDeletion: boolean;
    }>();

    editor.state.doc.descendants((node, pos) => {
        for (const mark of node.marks) {
            const name = mark.type.name;
            if (name === 'comment' && mark.attrs.commentId) {
                if (!commentPositions.has(mark.attrs.commentId)) {
                    commentPositions.set(mark.attrs.commentId, pos);
                }
                continue;
            }
            if (!node.isText) continue;
            if (name !== SuggestionType.Insertion && name !== SuggestionType.Deletion) continue;
            const id = mark.attrs.suggestionId as string;
            let g = groups.get(id);
            if (!g) {
                g = {
                    suggestionId: id,
                    authorId: mark.attrs.authorId,
                    authorName: mark.attrs.authorName,
                    authorColor: mark.attrs.authorColor,
                    timestamp: mark.attrs.timestamp,
                    insertionText: '', insertionFrom: 0, insertionTo: 0,
                    deletionText: '', deletionFrom: 0, deletionTo: 0,
                    hasInsertion: false, hasDeletion: false,
                };
                groups.set(id, g);
            }
            if (name === SuggestionType.Insertion) {
                if (!g.hasInsertion) { g.insertionFrom = pos; g.hasInsertion = true; }
                g.insertionText += node.text ?? '';
                g.insertionTo = pos + node.nodeSize;
            } else {
                if (!g.hasDeletion) { g.deletionFrom = pos; g.hasDeletion = true; }
                g.deletionText += node.text ?? '';
                g.deletionTo = pos + node.nodeSize;
            }
        }
    });

    const suggestions: SuggestionEntry[] = [];
    for (const g of groups.values()) {
        const base = {
            suggestionId: g.suggestionId,
            authorId: g.authorId, authorName: g.authorName,
            authorColor: g.authorColor, timestamp: g.timestamp,
        };
        if (g.hasInsertion && g.hasDeletion) {
            suggestions.push({
                ...base, kind: SuggestionEntryKind.Replace,
                deletedText: g.deletionText, insertedText: g.insertionText,
                deletedFrom: g.deletionFrom, deletedTo: g.deletionTo,
                insertedFrom: g.insertionFrom, insertedTo: g.insertionTo,
            });
        } else if (g.hasInsertion) {
            suggestions.push({ ...base, kind: SuggestionEntryKind.Insert, text: g.insertionText, from: g.insertionFrom, to: g.insertionTo });
        } else if (g.hasDeletion) {
            suggestions.push({ ...base, kind: SuggestionEntryKind.Delete, text: g.deletionText, from: g.deletionFrom, to: g.deletionTo });
        }
    }
    return { commentPositions, suggestions };
}

function suggestionDocPos(entry: SuggestionEntry): number {
    if (entry.kind === SuggestionEntryKind.Replace) return Math.min(entry.deletedFrom, entry.insertedFrom);
    return entry.from;
}

export function useUnifiedThreads(
    editor: Editor | null,
    doc: Y.Doc,
    filter: ThreadFilterKind,
    currentUser: User,
): UnifiedThread[] {
    const commentThreads = useCommentThreads(doc);
    const [docState, setDocState] = useState<DocCollections>(EMPTY_DOC_COLLECTIONS);

    useEffect(() => {
        if (!editor) {
            setDocState(EMPTY_DOC_COLLECTIONS);
            return;
        }
        // `update` fires on doc changes only — `transaction` would fire on
        // every selection change too, doubling traversal cost for no gain.
        const refresh = () => setDocState(collectFromDoc(editor));
        refresh();
        editor.on('update', refresh);
        return () => {
            editor.off('update', refresh);
        };
    }, [editor]);

    const currentUserId = currentUser.id;
    return useMemo(() => {
        const { commentPositions, suggestions } = docState;
        const threads: UnifiedThread[] = [];

        for (const thread of commentThreads) {
            if (filter === ThreadFilterKind.SuggestionsOnly) continue;
            if (filter === ThreadFilterKind.Open && thread.status !== CommentStatus.Open) continue;
            if (filter === ThreadFilterKind.Resolved && thread.status !== CommentStatus.Resolved) continue;
            if (filter === ThreadFilterKind.Mine && thread.authorId !== currentUserId &&
                !thread.replies.some((r) => r.authorId === currentUserId)) continue;
            const docPos = commentPositions.get(thread.id) ?? Number.MAX_SAFE_INTEGER;
            threads.push({ kind: ThreadKind.Comment, docPos, thread });
        }

        for (const entry of suggestions) {
            if (filter === ThreadFilterKind.Resolved) continue;
            if (filter === ThreadFilterKind.Mine && entry.authorId !== currentUserId) continue;
            threads.push({ kind: ThreadKind.Suggestion, docPos: suggestionDocPos(entry), entry });
        }

        threads.sort((a, b) => a.docPos - b.docPos);
        return threads;
    }, [commentThreads, docState, filter, currentUserId]);
}
