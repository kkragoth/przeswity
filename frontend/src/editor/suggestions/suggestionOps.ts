import type { Editor } from '@tiptap/react';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { MarkType } from '@tiptap/pm/model';

export enum SuggestionType {
    Insertion = 'insertion',
    Deletion = 'deletion',
    FormatChange = 'formatChange',
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

function deleteRanges(tr: Transaction, ranges: MarkRange[]): void {
    const sorted = [...ranges].sort((a, b) => b.from - a.from);
    for (const r of sorted) tr.delete(r.from, r.to);
}

function removeMark(tr: Transaction, ranges: MarkRange[], markType: MarkType): void {
    for (const r of ranges) {
        const from = tr.mapping.map(r.from, 1);
        const to = tr.mapping.map(r.to, -1);
        if (to > from) tr.removeMark(from, to, markType);
    }
}

function dispatchSkip(editor: Editor, tr: Transaction): void {
    tr.setMeta(META_SKIP, true);
    editor.view.dispatch(tr);
}

export function acceptSuggestion(editor: Editor, suggestionId: string): void {
    const { insertions, deletions } = findMarkRanges(editor.state, suggestionId);
    const tr = editor.state.tr;
    // Accept: drop deleted text, keep inserted text (remove insertion mark).
    deleteRanges(tr, deletions);
    const insertionType = editor.state.schema.marks[SuggestionType.Insertion];
    if (insertionType) removeMark(tr, insertions, insertionType);
    dispatchSkip(editor, tr);
}

export function rejectSuggestion(editor: Editor, suggestionId: string): void {
    const { insertions, deletions } = findMarkRanges(editor.state, suggestionId);
    const tr = editor.state.tr;
    // Reject: drop inserted text, keep original text (remove deletion mark).
    deleteRanges(tr, insertions);
    const deletionType = editor.state.schema.marks[SuggestionType.Deletion];
    if (deletionType) removeMark(tr, deletions, deletionType);
    dispatchSkip(editor, tr);
}

export function acceptFormatChange(editor: Editor, suggestionId: string): void {
    const formatChangeType = editor.state.schema.marks[SuggestionType.FormatChange];
    if (!formatChangeType) return;
    const tr = editor.state.tr;
    // Accept: remove the FormatChange mark — the underlying format stays.
    editor.state.doc.descendants((node, pos) => {
        if (!node.isText) return;
        const fmtMark = node.marks.find((m) => m.type === formatChangeType && m.attrs.suggestionId === suggestionId);
        if (!fmtMark) return;
        tr.removeMark(pos, pos + node.nodeSize, formatChangeType);
    });
    dispatchSkip(editor, tr);
}

export function rejectFormatChange(editor: Editor, suggestionId: string): void {
    const formatChangeType = editor.state.schema.marks[SuggestionType.FormatChange];
    if (!formatChangeType) return;
    const tr = editor.state.tr;

    // Collect affected ranges and the mark attrs before removing.
    const ranges: Array<{ from: number; to: number; marksAdded: string[]; marksRemoved: string[] }> = [];
    editor.state.doc.descendants((node, pos) => {
        if (!node.isText) return;
        const fmtMark = node.marks.find((m) => m.type === formatChangeType && m.attrs.suggestionId === suggestionId);
        if (!fmtMark) return;
        ranges.push({
            from: pos,
            to: pos + node.nodeSize,
            marksAdded: JSON.parse(String(fmtMark.attrs.marksAdded ?? '[]')) as string[],
            marksRemoved: JSON.parse(String(fmtMark.attrs.marksRemoved ?? '[]')) as string[],
        });
    });

    for (const { from, to, marksAdded, marksRemoved } of ranges) {
        // Reject: undo the added marks, re-apply the removed marks.
        for (const typeName of marksAdded) {
            const markType = editor.state.schema.marks[typeName];
            if (markType) tr.removeMark(from, to, markType);
        }
        for (const typeName of marksRemoved) {
            const markType = editor.state.schema.marks[typeName];
            if (markType) tr.addMark(from, to, markType.create());
        }
        tr.removeMark(from, to, formatChangeType);
    }
    dispatchSkip(editor, tr);
}
