import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

interface HoverRange { from: number; to: number }

export const threadHoverKey = new PluginKey<HoverRange | null>('threadHoverHighlight');
export const THREAD_HOVER_META = 'threadHoverHighlight';

export function setThreadHoverRange(tr: Transaction, range: HoverRange | null) {
    return tr.setMeta(THREAD_HOVER_META, range);
}

export const ThreadHoverHighlight = Extension.create({
    name: 'threadHoverHighlight',

    addProseMirrorPlugins() {
        return [
            new Plugin<HoverRange | null>({
                key: threadHoverKey,
                state: {
                    init() { return null; },
                    apply(tr, value) {
                        const meta = tr.getMeta(THREAD_HOVER_META);
                        if (meta === undefined) return value;
                        return meta as HoverRange | null;
                    },
                },
                props: {
                    decorations(state) {
                        const range = threadHoverKey.getState(state);
                        if (!range) return DecorationSet.empty;
                        const docSize = state.doc.content.size;
                        const from = Math.max(0, Math.min(range.from, docSize));
                        const to = Math.max(0, Math.min(range.to, docSize));
                        if (to <= from) return DecorationSet.empty;
                        return DecorationSet.create(state.doc, [
                            Decoration.inline(from, to, { class: 'thread-hover-preview' }),
                        ]);
                    },
                },
            }),
        ];
    },
});
