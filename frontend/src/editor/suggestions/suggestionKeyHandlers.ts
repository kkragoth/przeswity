import type { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import type { SuggestionModeOptions } from '@/editor/suggestions/SuggestionMode';
import { makeMarkAttrs, rangeAllHasMark } from '@/editor/suggestions/suggestionMarkUtils';

const META_SKIP = 'suggestionMode/skip';

export function backspaceInSuggestingMode(editor: Editor, opts: SuggestionModeOptions): boolean {
    if (!opts.getEnabled()) return false;
    const author = opts.getAuthor();
    if (!author) return false;
    const { state } = editor;
    const { selection, schema, doc } = state;
    const insertionType = schema.marks.insertion;
    const deletionType = schema.marks.deletion;
    if (!insertionType || !deletionType) return false;

    if (!selection.empty) {
        const { from, to } = selection;
        if (rangeAllHasMark(state, from, to, 'insertion', author.id)) {
            editor.view.dispatch(state.tr.delete(from, to).setMeta(META_SKIP, true));
            return true;
        }
        editor.view.dispatch(state.tr.addMark(from, to, deletionType.create(makeMarkAttrs(author))).setSelection(TextSelection.create(state.doc, from)).setMeta(META_SKIP, true));
        return true;
    }

    const pos = selection.from;
    if (pos === 0) return false;
    const $pos = doc.resolve(pos);
    if ($pos.parentOffset === 0) return false;
    const charFrom = pos - 1;
    const charTo = pos;
    const node = doc.nodeAt(charFrom);
    if (!node || !node.isText) return false;

    const hasOurInsertion = node.marks.some((m) => m.type === insertionType && m.attrs.authorId === author.id);
    const hasDeletion = node.marks.some((m) => m.type === deletionType);
    if (hasOurInsertion) editor.view.dispatch(state.tr.delete(charFrom, charTo).setMeta(META_SKIP, true));
    else if (hasDeletion) editor.view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, charFrom)).setMeta(META_SKIP, true));
    else editor.view.dispatch(state.tr.addMark(charFrom, charTo, deletionType.create(makeMarkAttrs(author))).setSelection(TextSelection.create(state.doc, charFrom)).setMeta(META_SKIP, true));
    return true;
}

export function forwardDeleteInSuggestingMode(editor: Editor, opts: SuggestionModeOptions): boolean {
    if (!opts.getEnabled()) return false;
    const author = opts.getAuthor();
    if (!author) return false;
    const { state } = editor;
    const { selection, schema, doc } = state;
    const insertionType = schema.marks.insertion;
    const deletionType = schema.marks.deletion;
    if (!insertionType || !deletionType) return false;

    if (!selection.empty) {
        const { from, to } = selection;
        if (rangeAllHasMark(state, from, to, 'insertion', author.id)) {
            editor.view.dispatch(state.tr.delete(from, to).setMeta(META_SKIP, true));
            return true;
        }
        editor.view.dispatch(state.tr.addMark(from, to, deletionType.create(makeMarkAttrs(author))).setSelection(TextSelection.create(state.doc, to)).setMeta(META_SKIP, true));
        return true;
    }

    const pos = selection.from;
    if (pos >= doc.content.size) return false;
    const $pos = doc.resolve(pos);
    if ($pos.parentOffset === $pos.parent.content.size) return false;
    const charFrom = pos;
    const charTo = pos + 1;
    const node = doc.nodeAt(charFrom);
    if (!node || !node.isText) return false;

    const hasOurInsertion = node.marks.some((m) => m.type === insertionType && m.attrs.authorId === author.id);
    const hasDeletion = node.marks.some((m) => m.type === deletionType);
    if (hasOurInsertion) editor.view.dispatch(state.tr.delete(charFrom, charTo).setMeta(META_SKIP, true));
    else if (hasDeletion) editor.view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, charTo)).setMeta(META_SKIP, true));
    else editor.view.dispatch(state.tr.addMark(charFrom, charTo, deletionType.create(makeMarkAttrs(author))).setSelection(TextSelection.create(state.doc, charTo)).setMeta(META_SKIP, true));
    return true;
}
