import type { Editor } from '@tiptap/react';
import type { EditorState } from '@tiptap/pm/state';

export enum SuggestionType {
    Insertion = 'insertion',
    Deletion = 'deletion',
}

const META_SKIP = 'suggestionMode/skip';

interface MarkRange {
    from: number
    to: number
}

interface SuggestionRanges {
    insertions: MarkRange[]
    deletions: MarkRange[]
}

function findMarkRanges(state: EditorState, suggestionId: string): SuggestionRanges {
    const insertions: MarkRange[] = [];
    const deletions: MarkRange[] = [];
    state.doc.descendants((node, pos) => {
        if (!node.isText) return;
        for (const mark of node.marks) {
            if (mark.attrs.suggestionId !== suggestionId) continue;
            const range = { from: pos, to: pos + node.nodeSize };
            if (mark.type.name === SuggestionType.Insertion) insertions.push(range);
            else if (mark.type.name === SuggestionType.Deletion) deletions.push(range);
        }
    });
    return { insertions, deletions };
}

function deleteRanges(editor: Editor, ranges: MarkRange[], removeAfter: { type: SuggestionType; ranges: MarkRange[] } | null) {
    const tr = editor.state.tr;
    const sorted = [...ranges].sort((a, b) => b.from - a.from);
    for (const r of sorted) tr.delete(r.from, r.to);
    if (removeAfter) {
        const markType = editor.state.schema.marks[removeAfter.type];
        if (markType) {
            for (const r of removeAfter.ranges) {
                const from = tr.mapping.map(r.from, 1);
                const to = tr.mapping.map(r.to, -1);
                if (to > from) tr.removeMark(from, to, markType);
            }
        }
    }
    tr.setMeta(META_SKIP, true);
    editor.view.dispatch(tr);
}

export function acceptSuggestion(editor: Editor, suggestionId: string): void {
    const { insertions, deletions } = findMarkRanges(editor.state, suggestionId);
    // Accept: keep the inserted text (drop the insertion mark), drop the deleted text.
    deleteRanges(editor, deletions, { type: SuggestionType.Insertion, ranges: insertions });
}

export function rejectSuggestion(editor: Editor, suggestionId: string): void {
    const { insertions, deletions } = findMarkRanges(editor.state, suggestionId);
    // Reject: keep the original text (drop the deletion mark), drop the inserted text.
    deleteRanges(editor, insertions, { type: SuggestionType.Deletion, ranges: deletions });
}
