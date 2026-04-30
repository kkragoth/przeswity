import type { Editor } from '@tiptap/react';
import * as Y from 'yjs';
import type { ContextMenuItem } from '@/editor/shell/ContextMenu';
import type { User } from '@/editor/identity/types';

export interface ContextCallbacks {
  onCreateComment: (id: string, quote: string) => void
  onActiveCommentChange: (id: string) => void
}

export interface BuildContextArgs {
    editor: Editor;
    user: User;
    doc: Y.Doc;
    clickPos: number;
    callbacks: ContextCallbacks;
    hasSelection: boolean;
}

export interface MarkSet {
    commentMark?: { attrs: Record<string, unknown> };
    insertionMark?: { attrs: Record<string, unknown> };
    deletionMark?: { attrs: Record<string, unknown> };
    linkMark?: { attrs: Record<string, unknown> };
}

export type ItemFactory = (args: BuildContextArgs, marks: MarkSet) => ContextMenuItem[];
