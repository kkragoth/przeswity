import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';

export interface GlossaryEntry {
  term: string
  translation: string
  notes?: string
}

export interface GlossaryHighlightOptions {
  getEntries: () => GlossaryEntry[]
}

const REFRESH_META = 'glossaryHighlight/refresh';
export const glossaryHighlightKey = new PluginKey<DecorationSet>('glossaryHighlight');

const MIN_TERM_LEN = 2;
const MAX_DECOS_PER_TERM = 200;

function buildDecos(doc: PMNode, entries: GlossaryEntry[]): DecorationSet {
    if (!entries.length) return DecorationSet.empty;
    // Sort by descending length so longer terms match first
    const sorted = [...entries]
        .filter((e) => e.term.trim().length >= MIN_TERM_LEN)
        .sort((a, b) => b.term.length - a.term.length);
    if (!sorted.length) return DecorationSet.empty;

    const decos: Decoration[] = [];
    const counts = new Map<string, number>();

    doc.descendants((node, pos) => {
        if (!node.isText) return;
        const text = (node.text ?? '').toLowerCase();
        if (!text) return;
        for (const entry of sorted) {
            const term = entry.term.trim().toLowerCase();
            if (term.length < MIN_TERM_LEN) continue;
            const count = counts.get(term) ?? 0;
            if (count >= MAX_DECOS_PER_TERM) continue;

            let idx = 0;
            let added = count;
            while (added < MAX_DECOS_PER_TERM) {
                const found = text.indexOf(term, idx);
                if (found === -1) break;
                const left = found === 0 ? '' : text[found - 1];
                const right = found + term.length === text.length ? '' : text[found + term.length];
                const isBoundary = (c: string) => c === '' || /[^\p{L}\p{N}_]/u.test(c);
                if (isBoundary(left) && isBoundary(right)) {
                    const tooltip = entry.translation
                        ? `${entry.term} → ${entry.translation}${entry.notes ? ' · ' + entry.notes : ''}`
                        : entry.term;
                    decos.push(
                        Decoration.inline(pos + found, pos + found + term.length, {
                            class: 'glossary-term',
                            title: tooltip,
                        }),
                    );
                    added++;
                }
                idx = found + term.length;
            }
            counts.set(term, added);
        }
    });
    return DecorationSet.create(doc, decos);
}

export const GlossaryHighlight = Extension.create<GlossaryHighlightOptions>({
    name: 'glossaryHighlight',

    addOptions() {
        return { getEntries: () => [] };
    },

    addProseMirrorPlugins() {
        const opts = this.options;
        return [
            new Plugin<DecorationSet>({
                key: glossaryHighlightKey,
                state: {
                    init: (_, { doc }) => buildDecos(doc, opts.getEntries()),
                    apply(tr, prev, _oldState, newState) {
                        if (tr.getMeta(REFRESH_META) || tr.docChanged) {
                            return buildDecos(newState.doc, opts.getEntries());
                        }
                        return prev.map(tr.mapping, tr.doc);
                    },
                },
                props: {
                    decorations(state) {
                        return glossaryHighlightKey.getState(state) ?? DecorationSet.empty;
                    },
                },
            }),
        ];
    },
});

export function refreshGlossaryDecorations(view: { dispatch: (tr: unknown) => void; state: { tr: unknown } }) {
    const tr = (view.state as unknown as { tr: { setMeta: (k: string, v: boolean) => unknown } }).tr
  ;(tr as unknown as { setMeta: (k: string, v: boolean) => void }).setMeta(REFRESH_META, true);
    view.dispatch(tr);
}
