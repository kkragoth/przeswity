import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { isChangeOrigin } from '@tiptap/extension-collaboration';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { ReplaceStep } from '@tiptap/pm/transform';
import type { Mark, Slice } from '@tiptap/pm/model';
import { backspaceInSuggestingMode, forwardDeleteInSuggestingMode } from '@/editor/suggestions/suggestionKeyHandlers';
import { applyMarkToSlice, attrsForAuthoredMark, stripInsertionFlood } from '@/editor/suggestions/suggestionMarkUtils';

interface StepWork {
  mappedFrom: number
  mappedTo: number
  removedSlice: Slice | null
}

function rangeFullyHasMark(state: EditorState, from: number, to: number, mark: Mark): boolean {
    let allHave = true;
    let sawText = false;
    state.doc.nodesBetween(from, to, (node) => {
        if (!node.isText) return;
        sawText = true;
        if (!mark.isInSet(node.marks)) allHave = false;
    });
    return sawText && allHave;
}

export interface SuggestionAuthor {
  id: string
  name: string
  color: string
}

export interface SuggestionModeOptions {
  getEnabled: () => boolean
  getAuthor: () => SuggestionAuthor | null
}

const META_SKIP = 'suggestionMode/skip';

export const SuggestionMode = Extension.create<SuggestionModeOptions>({
    name: 'suggestionMode',
    addOptions() {
        return { getEnabled: () => false, getAuthor: () => null };
    },
    addKeyboardShortcuts() {
        return {
            Backspace: ({ editor }) => backspaceInSuggestingMode(editor as Editor, this.options),
            Delete: ({ editor }) => forwardDeleteInSuggestingMode(editor as Editor, this.options),
        };
    },
    addProseMirrorPlugins() {
        const opts = this.options;
        return [new Plugin({
            key: new PluginKey('suggestionMode-marker'),
            appendTransaction(transactions, _oldState, newState) {
                const author = opts.getAuthor();
                if (!author) return null;
                if (transactions.some((t) => t.getMeta(META_SKIP)) || !transactions.some((t) => t.docChanged)) return null;

                const insertionType = newState.schema.marks.insertion;
                const deletionType = newState.schema.marks.deletion;
                if (!insertionType || !deletionType) return null;
                if (transactions.some(isChangeOrigin)) return stripInsertionFlood(newState, insertionType, author.id);
                if (!opts.getEnabled()) return null;

                const work: StepWork[] = [];
                for (let txIdx = 0; txIdx < transactions.length; txIdx++) {
                    const tx = transactions[txIdx];
                    if (tx.getMeta(META_SKIP)) continue;
                    for (let i = 0; i < tx.steps.length; i++) {
                        const step = tx.steps[i];
                        if (!(step instanceof ReplaceStep)) continue;
                        const removedSlice = step.to > step.from ? tx.docs[i].slice(step.from, step.to) : null;
                        if (step.slice.size === 0 && (!removedSlice || removedSlice.size === 0)) continue;

                        let mappedFrom = step.from;
                        let mappedTo = step.from + step.slice.size;
                        for (let j = i + 1; j < tx.steps.length; j++) {
                            mappedFrom = tx.steps[j].getMap().map(mappedFrom, 1);
                            mappedTo = tx.steps[j].getMap().map(mappedTo, -1);
                        }
                        for (let j = txIdx + 1; j < transactions.length; j++) {
                            mappedFrom = transactions[j].mapping.map(mappedFrom, 1);
                            mappedTo = transactions[j].mapping.map(mappedTo, -1);
                        }
                        work.push({ mappedFrom, mappedTo, removedSlice });
                    }
                }

                // Process from highest position to lowest so earlier positions stay valid
                // as we mutate `tr` (insertions only push content forward).
                work.sort((a, b) => b.mappedFrom - a.mappedFrom);

                const tr = newState.tr;
                for (const w of work) {
                    const { mappedFrom, mappedTo, removedSlice } = w;
                    if (mappedFrom < 0 || mappedFrom > newState.doc.content.size) continue;
                    const hasInsertion = mappedTo > mappedFrom && mappedTo <= newState.doc.content.size;
                    const hasDeletion = !!removedSlice && removedSlice.size > 0;

                    // When a single step both inserts and removes content (type-over-selection,
                    // paste-replace, etc.), share one suggestionId between the deletion and
                    // insertion marks so the sidebar shows them as one "replace" entry.
                    const pairedAttrs = hasInsertion && hasDeletion
                        ? attrsForAuthoredMark(newState, insertionType, author, mappedFrom, mappedTo)
                        : null;

                    if (hasInsertion) {
                        // Reuse a neighboring insertion mark from the same author so consecutive
                        // typing collapses into one suggestion entry. The insertion mark uses
                        // `excludes: ''` so multiple authors' marks can overlap; without this
                        // dedup, every keystroke would mint a fresh suggestionId.
                        const insAttrs = pairedAttrs
                            ?? attrsForAuthoredMark(newState, insertionType, author, mappedFrom, mappedTo);
                        const insMark: Mark = insertionType.create(insAttrs);
                        if (!rangeFullyHasMark(newState, mappedFrom, mappedTo, insMark)) {
                            tr.addMark(mappedFrom, mappedTo, insMark);
                        }
                        tr.removeMark(mappedFrom, mappedTo, deletionType);
                    }

                    // Restore content removed by inputs that bypass our key handlers
                    // (type-over-selection, paste-replace, cut, drag-drop, IME) and tag it
                    // as a suggested deletion.
                    if (hasDeletion && removedSlice) {
                        const delAttrs = pairedAttrs
                            ?? attrsForAuthoredMark(newState, deletionType, author, mappedFrom, mappedFrom);
                        const markedSlice = applyMarkToSlice(removedSlice, deletionType.create(delAttrs));
                        try {
                            tr.replace(mappedFrom, mappedFrom, markedSlice);
                        } catch {
                            // Slice doesn't fit the new context (e.g. cross-block deletion
                            // collapsed to a different structure). Let the actual deletion stand.
                        }
                    }
                }
                if (tr.steps.length === 0) return null;
                tr.setMeta(META_SKIP, true);
                tr.setMeta('addToHistory', false);
                return tr;
            },
        })];
    },
});
