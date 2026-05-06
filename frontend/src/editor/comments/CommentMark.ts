import { Mark, mergeAttributes } from '@tiptap/core';

export interface CommentOptions {
  HTMLAttributes: Record<string, unknown>
  onCommentClick: (commentId: string) => void
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      setComment: (commentId: string) => ReturnType
      unsetComment: (commentId: string) => ReturnType
    }
  }
}

export const Comment = Mark.create<CommentOptions>({
    name: 'comment',
    inclusive: false,
    spanning: true,
    excludes: '',

    addOptions() {
        return {
            HTMLAttributes: {},
            onCommentClick: () => {},
        };
    },

    addAttributes() {
        return {
            commentId: {
                default: null,
                parseHTML: (el) => el.getAttribute('data-comment-id'),
                renderHTML: (attrs) => ({ 'data-comment-id': attrs.commentId }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'span[data-comment-id]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: 'comment-anchor' }),
            0,
        ];
    },

    addCommands() {
        return {
            setComment:
        (commentId) =>
            ({ commands }) =>
                commands.setMark(this.name, { commentId }),
            unsetComment:
        (commentId) =>
            ({ tr, state, dispatch }) => {
                const { from, to } = state.selection;
                let modified = false;
                state.doc.nodesBetween(0, state.doc.content.size, (node, pos) => {
                    const mark = node.marks.find(
                        (m) => m.type.name === 'comment' && m.attrs.commentId === commentId,
                    );
                    if (mark) {
                        tr.removeMark(pos, pos + node.nodeSize, mark);
                        modified = true;
                    }
                });
                // Suppress unused-warning for selection coords
                void from;
                void to;
                if (dispatch && modified) {
                    tr.setMeta('comment:explicit-unset', true);
                    dispatch(tr);
                }
                return modified;
            },
        };
    },
});
