import type { EditorState } from '@tiptap/pm/state';
import type { MarkType } from '@tiptap/pm/model';
import { makeId } from '@/editor/utils';
import type { SuggestionAuthor } from '@/editor/suggestions/SuggestionMode';
import { SuggestionType } from '@/editor/suggestions/suggestionOps';

export function makeMarkAttrs(author: SuggestionAuthor) {
    return {
        suggestionId: makeId(),
        authorId: author.id,
        authorName: author.name,
        authorColor: author.color,
        timestamp: Date.now(),
    };
}

function insertionCoverage(state: EditorState, authorId: string): { total: number; authoredInsertion: number; deletion: number } {
    let total = 0;
    let authoredInsertion = 0;
    let deletion = 0;
    state.doc.descendants((node) => {
        if (!node.isText) return;
        const size = node.text?.length ?? 0;
        if (size === 0) return;
        total += size;
        if (node.marks.some((m) => m.type.name === SuggestionType.Deletion)) deletion += size;
        if (node.marks.some((m) => m.type.name === SuggestionType.Insertion && m.attrs.authorId === authorId)) authoredInsertion += size;
    });
    return { total, authoredInsertion, deletion };
}

export function rangeAllHasMark(state: EditorState, from: number, to: number, markName: string, authorId?: string): boolean {
    let allHave = true;
    state.doc.nodesBetween(from, to, (node) => {
        if (!node.isText) return;
        const has = node.marks.some((m) => m.type.name === markName && (authorId ? m.attrs.authorId === authorId : true));
        if (!has) allHave = false;
    });
    return allHave;
}

export function stripInsertionFlood(state: EditorState, insertionType: MarkType, authorId: string) {
    const coverage = insertionCoverage(state, authorId);
    // why: remote merges can briefly mark almost the whole document as one user's insertion;
    // clear this noisy flood while preserving real mixed insertion/deletion changes.
    if (coverage.total < 20 || coverage.deletion > 0 || coverage.authoredInsertion / coverage.total < 0.9) return null;
    const tr = state.tr;
    state.doc.nodesBetween(0, state.doc.content.size, (node, pos) => {
        if (!node.isText) return;
        const hasAuthoredInsertion = node.marks.some((m) => m.type === insertionType && m.attrs.authorId === authorId);
        if (hasAuthoredInsertion) tr.removeMark(pos, pos + node.nodeSize, insertionType);
    });
    if (!tr.docChanged) return null;
    tr.setMeta('suggestionMode/skip', true);
    tr.setMeta('addToHistory', false);
    return tr;
}
