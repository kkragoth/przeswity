import type { EditorState } from '@tiptap/pm/state';
import { Fragment, Slice, type Mark, type MarkType, type Node } from '@tiptap/pm/model';
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

export function findAuthoredMarkAt(
    state: EditorState,
    markType: MarkType,
    authorId: string,
    pos: number,
): Mark | null {
    if (pos < 0 || pos > state.doc.content.size) return null;
    const $pos = state.doc.resolve(pos);
    const candidates = [$pos.nodeBefore, $pos.nodeAfter];
    for (const node of candidates) {
        if (!node?.isText) continue;
        const found = node.marks.find((m) => m.type === markType && m.attrs.authorId === authorId);
        if (found) return found;
    }
    return null;
}

function applyMarkToFragment(fragment: Fragment, mark: Mark): Fragment {
    const children: Node[] = [];
    fragment.forEach((child) => {
        if (child.isText) {
            children.push(child.mark(mark.addToSet(child.marks)));
        } else if (child.content.size > 0) {
            children.push(child.copy(applyMarkToFragment(child.content, mark)));
        } else {
            children.push(child);
        }
    });
    return Fragment.fromArray(children);
}

export function applyMarkToSlice(slice: Slice, mark: Mark): Slice {
    return new Slice(applyMarkToFragment(slice.content, mark), slice.openStart, slice.openEnd);
}

export function attrsForAuthoredMark(
    state: EditorState,
    markType: MarkType,
    author: SuggestionAuthor,
    from: number,
    to: number,
): Record<string, unknown> {
    const neighbor = findAuthoredMarkAt(state, markType, author.id, from)
        ?? findAuthoredMarkAt(state, markType, author.id, to);
    return neighbor ? neighbor.attrs : makeMarkAttrs(author);
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
