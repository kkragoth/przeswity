import type { Editor } from '@tiptap/react';
import { SuggestionType } from './suggestionOps';
import {
    SuggestionEntryKind,
    type FormatSummary,
    type SuggestionEntry,
} from '@/containers/editor/suggestions/components/SuggestionItem';

interface FormatGroup {
    suggestionId: string
    authorId: string
    authorName: string
    authorColor: string
    timestamp: number
    from: number
    to: number
    marksAdded: string[]
    marksRemoved: string[]
    nodeAttrRaw: string
}

function parseJsonSafe<T>(raw: string, fallback: T): T {
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function buildFormatSummary(group: FormatGroup): FormatSummary {
    const nodeAttr = parseJsonSafe<{ attr: string; before: unknown; after: unknown } | null>(group.nodeAttrRaw, null);
    const addCount = group.marksAdded.length;
    const removeCount = group.marksRemoved.length;
    const total = addCount + removeCount + (nodeAttr ? 1 : 0);

    if (total === 1) {
        if (addCount === 1) return { kind: 'mark-add', markName: group.marksAdded[0] };
        if (removeCount === 1) return { kind: 'mark-remove', markName: group.marksRemoved[0] };
        if (nodeAttr) return { kind: 'node-attr', attr: nodeAttr.attr, from: nodeAttr.before, to: nodeAttr.after };
    }
    return { kind: 'multi', count: total };
}

export function collectFormatChanges(editor: Editor): SuggestionEntry[] {
    const groups = new Map<string, FormatGroup>();

    editor.state.doc.descendants((node, pos) => {
        if (!node.isText) return;
        for (const mark of node.marks) {
            if (mark.type.name !== SuggestionType.FormatChange) continue;
            const id = mark.attrs.suggestionId as string;
            if (!id) continue;
            let group = groups.get(id);
            if (!group) {
                group = {
                    suggestionId: id,
                    authorId: String(mark.attrs.authorId ?? ''),
                    authorName: String(mark.attrs.authorName ?? ''),
                    authorColor: String(mark.attrs.authorColor ?? ''),
                    timestamp: Number(mark.attrs.timestamp ?? 0),
                    from: pos,
                    to: pos + node.nodeSize,
                    marksAdded: parseJsonSafe<string[]>(String(mark.attrs.marksAdded ?? '[]'), []),
                    marksRemoved: parseJsonSafe<string[]>(String(mark.attrs.marksRemoved ?? '[]'), []),
                    nodeAttrRaw: String(mark.attrs.nodeAttr ?? 'null'),
                };
                groups.set(id, group);
            } else {
                group.to = Math.max(group.to, pos + node.nodeSize);
            }
        }
    });

    return Array.from(groups.values()).map((g) => ({
        kind: SuggestionEntryKind.Format as const,
        suggestionId: g.suggestionId,
        authorId: g.authorId,
        authorName: g.authorName,
        authorColor: g.authorColor,
        timestamp: g.timestamp,
        from: g.from,
        to: g.to,
        summary: buildFormatSummary(g),
    }));
}
