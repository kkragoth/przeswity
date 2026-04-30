import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { MutableRefObject } from 'react';
import type { ContextMenuItem } from '@/editor/shell/ContextMenu';
import { buildContextItems } from '@/editor/tiptap/contextItems';
import type { CollabBundle } from '@/editor/collab/yDoc';
import type { User } from '@/editor/identity/types';

export interface ContextMenuState {
    x: number;
    y: number;
    items: ContextMenuItem[];
}

interface UseEditorContextMenuOptions {
    editor: Editor | null;
    collab: CollabBundle;
    userRef: MutableRefObject<User>;
    onCreateComment: (commentId: string, originalQuote: string) => void;
    onActiveCommentChange: (commentId: string | null) => void;
}

export function useEditorContextMenu({
    editor,
    collab,
    userRef,
    onCreateComment,
    onActiveCommentChange,
}: UseEditorContextMenuOptions) {
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    useEffect(() => {
        if (!editor) return;
        let dom: HTMLElement | null = null;
        let timer: number | null = null;
        const handler = (e: MouseEvent) => {
            if (e.shiftKey) return;
            e.preventDefault();
            e.stopPropagation();
            const view = editor.view;
            const coords = view.posAtCoords({ left: e.clientX, top: e.clientY });
            const clickPos = coords ? coords.pos : view.state.selection.from;
            const sel = editor.state.selection;
            const insideSelection = !sel.empty && clickPos >= sel.from && clickPos <= sel.to;
            if (!insideSelection && coords) editor.commands.setTextSelection(clickPos);
            const items = buildContextItems(editor, userRef.current, collab.doc, clickPos, {
                onCreateComment,
                onActiveCommentChange,
            });
            setContextMenu({ x: e.clientX, y: e.clientY, items });
        };

        const bindContextMenu = () => {
            if (!editor || editor.isDestroyed) return;
            try {
                dom = editor.view.dom as HTMLElement;
            } catch {
                return;
            }
            dom.addEventListener('contextmenu', handler);
        };

        timer = window.setTimeout(bindContextMenu, 0);

        return () => {
            if (timer !== null) window.clearTimeout(timer);
            if (dom) dom.removeEventListener('contextmenu', handler);
        };
    }, [editor, collab.doc, onCreateComment, onActiveCommentChange, userRef]);

    return { contextMenu, setContextMenu };
}
