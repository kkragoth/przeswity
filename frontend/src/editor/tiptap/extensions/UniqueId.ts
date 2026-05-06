import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

const BLOCK_TYPES = [
    'paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList',
    'listItem', 'codeBlock', 'horizontalRule', 'image',
];

function generateUid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const UniqueId = Extension.create({
    name: 'uniqueId',

    addGlobalAttributes() {
        return [{
            types: BLOCK_TYPES,
            attributes: {
                uid: {
                    default: null,
                    parseHTML: (el) => el.getAttribute('data-uid'),
                    renderHTML: (attrs) => attrs.uid ? { 'data-uid': attrs.uid } : {},
                },
            },
        }];
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('uniqueId'),
                appendTransaction(transactions, _oldState, newState) {
                    if (!transactions.some((tr) => tr.docChanged)) return null;
                    const tr = newState.tr;
                    let changed = false;
                    newState.doc.descendants((node, pos) => {
                        if (!node.isBlock || !BLOCK_TYPES.includes(node.type.name)) return;
                        if (!node.attrs.uid) {
                            tr.setNodeMarkup(pos, undefined, { ...node.attrs, uid: generateUid() });
                            changed = true;
                        }
                    });
                    return changed ? tr.setMeta('addToHistory', false) : null;
                },
            }),
        ];
    },
});
