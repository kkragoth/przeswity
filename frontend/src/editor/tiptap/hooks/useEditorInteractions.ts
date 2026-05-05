import type { MouseEvent } from 'react';
import { makeId } from '@/editor/utils';
import type { Editor } from '@tiptap/react';

export function addCommentFromBubble(editor: Editor | null, onCreateComment: (commentId: string, originalQuote: string) => void) {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const id = makeId();
    const quote = editor.state.doc.textBetween(from, to, ' ');
    editor.chain().focus().setComment(id).run();
    onCreateComment(id, quote);
}

export function focusOnEmptyClick(
    e: MouseEvent<HTMLDivElement>,
    editor: Editor | null,
    canEditOrSuggest: boolean,
) {
    if (!editor || !canEditOrSuggest) return;
    const target = e.target as HTMLElement;
    if (target.closest('.prose-editor, [data-comment-id], .drag-handle, button, [role="button"], a, input, textarea')) return;
    e.preventDefault();
    editor.commands.focus('end');
}
