import { useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import * as Y from 'yjs';
import { useCommentThreads } from '@/editor/comments/useCommentThreads';
import { CommentStatus } from '@/editor/comments/types';
import { SuggestionType } from '@/editor/suggestions/suggestionOps';
import { collectFormatChanges } from '@/editor/suggestions/collectFormatChanges';
import { SuggestionEntryKind, type SuggestionEntry } from '@/containers/editor/suggestions/components/SuggestionItem';
import {
    ThreadKind,
    ThreadStatusFilter,
    ThreadTypeFilter,
    ThreadSort,
    unifiedThreadAuthorId,
    unifiedThreadTimestamp,
    type UnifiedThread,
} from './types';
import type { User } from '@/editor/identity/types';

interface SectionAnchor {
    pos: number;
    title: string;
    level: number;
}

interface DocCollections {
    commentPositions: Map<string, number>;
    suggestions: SuggestionEntry[];
    sections: SectionAnchor[];
}

const EMPTY_DOC_COLLECTIONS: DocCollections = {
    commentPositions: new Map(),
    suggestions: [],
    sections: [],
};

/**
 * Single-pass walk: collects first-occurrence positions for comment marks,
 * grouped suggestion entries, and heading anchors used for section grouping.
 * One traversal per doc change feeds three callers (sort, filter, group).
 */
function collectFromDoc(editor: Editor): DocCollections {
    const commentPositions = new Map<string, number>();
    const sections: SectionAnchor[] = [];
    const groups = new Map<string, {
        suggestionId: string; authorId: string; authorName: string;
        authorColor: string; timestamp: number;
        insertionText: string; insertionFrom: number; insertionTo: number;
        deletionText: string; deletionFrom: number; deletionTo: number;
        hasInsertion: boolean; hasDeletion: boolean;
    }>();

    editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
            sections.push({
                pos,
                title: node.textContent.trim() || '',
                level: Number(node.attrs.level ?? 1),
            });
        }
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
    suggestions.push(...collectFormatChanges(editor));
    sections.sort((a, b) => a.pos - b.pos);
    return { commentPositions, suggestions, sections };
}

function suggestionDocPos(entry: SuggestionEntry): number {
    if (entry.kind === SuggestionEntryKind.Replace) return Math.min(entry.deletedFrom, entry.insertedFrom);
    return entry.from;
}

export interface ThreadsQuery {
    status: ThreadStatusFilter;
    type: ThreadTypeFilter;
    onlyMine: boolean;
    sort: ThreadSort;
    authorId?: string | null;
}

export interface ThreadCounts {
    open: number;
    resolved: number;
    comments: number;
    suggestions: number;
    mine: number;
    total: number;
}

export interface ThreadsResult {
    threads: UnifiedThread[];
    counts: ThreadCounts;
    sectionFor: (docPos: number) => SectionAnchor | null;
    sections: SectionAnchor[];
}

const EMPTY_COUNTS: ThreadCounts = {
    open: 0, resolved: 0, comments: 0, suggestions: 0, mine: 0, total: 0,
};

/**
 * Returns a partition function: for each doc position, the heading directly
 * preceding it (or null if before the first heading). Implemented as a closure
 * because the call site iterates threads in arbitrary order, not doc order,
 * so a single binary search per call avoids O(n*m) scans.
 */
function makeSectionLookup(sections: SectionAnchor[]): (pos: number) => SectionAnchor | null {
    if (sections.length === 0) return () => null;
    return (pos: number) => {
        let lo = 0, hi = sections.length - 1, found = -1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (sections[mid].pos <= pos) { found = mid; lo = mid + 1; } else hi = mid - 1;
        }
        return found >= 0 ? sections[found] : null;
    };
}

export function useUnifiedThreads(
    editor: Editor | null,
    doc: Y.Doc,
    query: ThreadsQuery,
    currentUser: User,
): ThreadsResult {
    const commentThreads = useCommentThreads(doc);
    const [docState, setDocState] = useState<DocCollections>(EMPTY_DOC_COLLECTIONS);

    useEffect(() => {
        if (!editor) {
            setDocState(EMPTY_DOC_COLLECTIONS);
            return;
        }
        const refresh = () => setDocState(collectFromDoc(editor));
        refresh();
        editor.on('update', refresh);
        return () => { editor.off('update', refresh); };
    }, [editor]);

    const currentUserId = currentUser.id;

    return useMemo(() => {
        const { commentPositions, suggestions, sections } = docState;
        const all: UnifiedThread[] = [];

        for (const thread of commentThreads) {
            const docPos = commentPositions.get(thread.id) ?? Number.MAX_SAFE_INTEGER;
            all.push({ kind: ThreadKind.Comment, docPos, thread });
        }
        for (const entry of suggestions) {
            all.push({ kind: ThreadKind.Suggestion, docPos: suggestionDocPos(entry), entry });
        }

        const counts: ThreadCounts = { ...EMPTY_COUNTS };
        for (const t of all) {
            if (t.kind === ThreadKind.Comment) {
                counts.comments++;
                if (t.thread.status === CommentStatus.Resolved) counts.resolved++;
                else counts.open++;
                if (t.thread.authorId === currentUserId
                    || t.thread.replies.some((r) => r.authorId === currentUserId)) {
                    counts.mine++;
                }
            } else {
                counts.suggestions++;
                counts.open++;
                if (t.entry.authorId === currentUserId) counts.mine++;
            }
            counts.total++;
        }

        const filtered = all.filter((t) => {
            if (t.kind === ThreadKind.Comment) {
                if (query.type === ThreadTypeFilter.Suggestions) return false;
                const isOpen = t.thread.status !== CommentStatus.Resolved;
                if (query.status === ThreadStatusFilter.Open && !isOpen) return false;
                if (query.status === ThreadStatusFilter.Resolved && isOpen) return false;
                if (query.onlyMine && t.thread.authorId !== currentUserId
                    && !t.thread.replies.some((r) => r.authorId === currentUserId)) return false;
                if (query.authorId && t.thread.authorId !== query.authorId) return false;
            } else {
                if (query.type === ThreadTypeFilter.Comments) return false;
                if (query.status === ThreadStatusFilter.Resolved) return false;
                if (query.onlyMine && t.entry.authorId !== currentUserId) return false;
                if (query.authorId && t.entry.authorId !== query.authorId) return false;
            }
            return true;
        });

        if (query.sort === ThreadSort.Newest) {
            filtered.sort((a, b) => unifiedThreadTimestamp(b) - unifiedThreadTimestamp(a));
        } else if (query.sort === ThreadSort.Oldest) {
            filtered.sort((a, b) => unifiedThreadTimestamp(a) - unifiedThreadTimestamp(b));
        } else {
            filtered.sort((a, b) => a.docPos - b.docPos);
        }

        return {
            threads: filtered,
            counts,
            sections,
            sectionFor: makeSectionLookup(sections),
        };
    }, [commentThreads, docState, query.status, query.type, query.onlyMine, query.sort, query.authorId, currentUserId]);
}

export function uniqueAuthors(threads: UnifiedThread[]): { id: string; name: string }[] {
    const seen = new Map<string, string>();
    for (const t of threads) {
        const id = unifiedThreadAuthorId(t);
        if (seen.has(id)) continue;
        seen.set(id, t.kind === ThreadKind.Comment ? t.thread.authorName : t.entry.authorName);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}
