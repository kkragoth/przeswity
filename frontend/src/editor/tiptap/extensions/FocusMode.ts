import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const focusModeKey = new PluginKey<DecorationSet>('focusMode');

function buildDecorations(state: EditorState, enabled: boolean): DecorationSet {
    if (!enabled) return DecorationSet.empty;
    const { $anchor } = state.selection;
    const activeDepth = $anchor.depth;
    const activePos = $anchor.before(Math.max(1, activeDepth));
    const decos: Decoration[] = [];
    state.doc.descendants((node, pos) => {
        if (!node.isBlock || node.childCount === 0) return;
        if (pos !== activePos) {
            decos.push(Decoration.node(pos, pos + node.nodeSize, { class: 'is-focus-dimmed' }));
        }
    });
    return DecorationSet.create(state.doc, decos);
}

export const FocusMode = Extension.create({
    name: 'focusMode',

    addOptions() {
        return { enabled: false };
    },

    addProseMirrorPlugins() {
        const opts = this.options as { enabled: boolean };
        return [
            new Plugin({
                key: focusModeKey,
                state: {
                    init(_, state) { return buildDecorations(state, opts.enabled); },
                    apply(tr, deco, _old, state) {
                        if (!tr.docChanged && !tr.selectionSet) return deco;
                        return buildDecorations(state, opts.enabled);
                    },
                },
                props: {
                    decorations(state) { return focusModeKey.getState(state); },
                },
            }),
        ];
    },
});
