import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { isChangeOrigin } from '@tiptap/extension-collaboration';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ReplaceStep } from '@tiptap/pm/transform';
import type { Mark } from '@tiptap/pm/model';
import { backspaceInSuggestingMode, forwardDeleteInSuggestingMode } from '@/editor/suggestions/suggestionKeyHandlers';
import { makeMarkAttrs, stripInsertionFlood } from '@/editor/suggestions/suggestionMarkUtils';

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

                const tr = newState.tr;
                let modified = false;
                for (let txIdx = 0; txIdx < transactions.length; txIdx++) {
                    const tx = transactions[txIdx];
                    if (tx.getMeta(META_SKIP)) continue;
                    for (let i = 0; i < tx.steps.length; i++) {
                        const step = tx.steps[i];
                        if (!(step instanceof ReplaceStep) || step.slice.size === 0) continue;
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
                        if (mappedFrom >= mappedTo || mappedTo > newState.doc.content.size) continue;
                        const mark: Mark = insertionType.create(makeMarkAttrs(author));
                        tr.addMark(mappedFrom, mappedTo, mark);
                        tr.removeMark(mappedFrom, mappedTo, deletionType);
                        modified = true;
                    }
                }
                if (!modified) return null;
                tr.setMeta(META_SKIP, true);
                tr.setMeta('addToHistory', false);
                return tr;
            },
        })];
    },
});
