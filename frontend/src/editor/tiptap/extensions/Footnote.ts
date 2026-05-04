// TODO (Phase 41 follow-up): replace window.prompt in the nodeView mousedown
// handler with an injected async callback. TipTap NodeViews run outside React
// so host-side wiring is required.
import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    footnote: {
      insertFootnote: (text: string) => ReturnType
    }
  }
}

export const Footnote = Node.create({
    name: 'footnote',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,
    draggable: false,

    addAttributes() {
        return {
            text: {
                default: '',
                parseHTML: (el) => el.getAttribute('data-text') ?? el.getAttribute('title') ?? '',
                renderHTML: (attrs) => ({ 'data-text': attrs.text, title: attrs.text }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'sup[data-footnote]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'sup',
            mergeAttributes({ 'data-footnote': '', class: 'footnote-marker' }, HTMLAttributes),
        ];
    },

    addNodeView() {
        return ({ node, getPos, editor }) => {
            const dom = document.createElement('sup');
            dom.classList.add('footnote-marker');
            dom.setAttribute('data-footnote', '');
            dom.setAttribute('data-text', node.attrs.text || '');
            dom.title = node.attrs.text || '(empty footnote — click to edit)';
            dom.contentEditable = 'false';
            dom.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const next = window.prompt('Footnote text', node.attrs.text || '');
                if (next === null) return;
                const pos = typeof getPos === 'function' ? getPos() : undefined;
                if (pos === undefined) return;
                editor
                    .chain()
                    .setNodeSelection(pos)
                    .updateAttributes('footnote', { text: next })
                    .run();
            });
            return {
                dom,
                update: (updated) => {
                    if (updated.type.name !== 'footnote') return false;
                    dom.title = (updated.attrs.text as string) || '(empty footnote — click to edit)';
                    dom.setAttribute('data-text', (updated.attrs.text as string) || '');
                    return true;
                },
            };
        };
    },

    addCommands() {
        return {
            insertFootnote:
        (text) =>
            ({ chain }) =>
                chain().insertContent({ type: 'footnote', attrs: { text } }).run(),
        };
    },
});
