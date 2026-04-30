import type { ContextMenuItem } from '@/editor/shell/ContextMenu';
import { clipboardItems } from '@/editor/tiptap/contextItems/clipboardItems';
import { commentItems } from '@/editor/tiptap/contextItems/commentItems';
import { formattingItems } from '@/editor/tiptap/contextItems/formattingItems';
import { suggestionItems } from '@/editor/tiptap/contextItems/suggestionItems';
import type { ContextCallbacks } from '@/editor/tiptap/contextItems/types';
import type { Editor } from '@tiptap/react';
import type { User } from '@/editor/identity/types';
import * as Y from 'yjs';

export function buildContextItems(
    editor: Editor,
    user: User,
    doc: Y.Doc,
    clickPos: number,
    callbacks: ContextCallbacks,
): ContextMenuItem[] {
    const sel = editor.state.selection;
    const hasSelection = !sel.empty;
    const node = editor.state.doc.nodeAt(clickPos);
    const marks = node?.marks ?? [];
    const markSet = {
        commentMark: marks.find((m) => m.type.name === 'comment'),
        insertionMark: marks.find((m) => m.type.name === 'insertion'),
        deletionMark: marks.find((m) => m.type.name === 'deletion'),
        linkMark: marks.find((m) => m.type.name === 'link'),
    };

    const args = { editor, user, doc, clickPos, callbacks, hasSelection };
    return [
        ...clipboardItems(args),
        ...suggestionItems(args, markSet),
        ...commentItems(args, markSet),
        ...formattingItems(args, markSet),
        { label: '', separator: true },
        { label: 'Select all', shortcut: '⌘A', icon: '⊡', action: () => editor.chain().focus().selectAll().run() },
    ];
}
