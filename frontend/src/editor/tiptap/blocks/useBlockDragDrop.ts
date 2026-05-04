import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { Editor } from '@tiptap/react';
import { BLOCK_DROP_MIDPOINT_RATIO } from '@/editor/constants';
import { readEffectiveZoom } from '@/contexts/EditorZoomContext';

export interface DragState {
  from: number
  to: number
  insertAt: number | null
  active: boolean
}

/**
 * Returns true when the pointer is in the upper half of the block rect,
 * meaning the drop indicator should appear *above* the block.
 */
export function isDropAbove(clientY: number, rect: DOMRect): boolean {
    return clientY < rect.top + rect.height * BLOCK_DROP_MIDPOINT_RATIO;
}

export const INITIAL_DRAG_STATE: DragState = {
    from: 0,
    to: 0,
    insertAt: null,
    active: false,
};

export interface BlockDrag {
    dragStateRef: MutableRefObject<DragState>;
    dropTop: number | null;
    setDropTop: (top: number | null) => void;
    resetDrag: () => void;
}

/**
 * Encapsulates all mutable drag state: the ref used by editorProps.handleDrop,
 * the dropTop indicator position, and the reset callback.
 */
export function useBlockDrag(): BlockDrag {
    const dragStateRef = useRef<DragState>({ ...INITIAL_DRAG_STATE });
    const [dropTop, setDropTop] = useState<number | null>(null);
    const resetDrag = () => {
        dragStateRef.current = { ...INITIAL_DRAG_STATE };
        setDropTop(null);
    };
    return { dragStateRef, dropTop, setDropTop, resetDrag };
}

/**
 * Installs the dragover/dragleave listener that powers the drop indicator.
 * Reads dragStateRef from useBlockDrag so editorProps.handleDrop can share the same ref.
 */
export function useBlockDragOver(
    editor: Editor | null,
    dragStateRef: MutableRefObject<DragState>,
    setDropTop: (top: number | null) => void,
): void {
    useEffect(() => {
        if (!editor) return;
        const view = editor.view;
        const dom = view.dom as HTMLElement;
        const page = dom.closest('.editor-page') as HTMLElement | null;
        if (!page) return;

        const onDragOver = (e: DragEvent) => {
            if (!dragStateRef.current.active) return;
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

            const posResult = view.posAtCoords({ left: e.clientX, top: e.clientY });
            if (!posResult) return;
            let $drop;
            try {
                $drop = view.state.doc.resolve(posResult.pos);
            } catch {
                return;
            }
            if ($drop.depth < 1) return;

            const blockStart = $drop.before(1);
            const blockEnd = $drop.after(1);
            const blockEl = view.nodeDOM(blockStart) as HTMLElement | null;
            if (!blockEl?.getBoundingClientRect) return;

            const blockRect = blockEl.getBoundingClientRect();
            const pageRect = page.getBoundingClientRect();
            const zoom = readEffectiveZoom(page);
            const dropBefore = isDropAbove(e.clientY, blockRect);
            const insertAt = dropBefore ? blockStart : blockEnd;
            const indicatorTop = ((dropBefore ? blockRect.top : blockRect.bottom) - pageRect.top) / zoom;

            const { from, to } = dragStateRef.current;
            if (insertAt >= from && insertAt <= to) {
                // dropping on self
                setDropTop(null);
                dragStateRef.current.insertAt = null;
                return;
            }
            dragStateRef.current.insertAt = insertAt;
            setDropTop(indicatorTop);
        };

        const onDragLeave = (e: DragEvent) => {
            if (e.relatedTarget && page.contains(e.relatedTarget as Node)) return;
            setDropTop(null);
        };

        page.addEventListener('dragover', onDragOver);
        page.addEventListener('dragleave', onDragLeave);
        return () => {
            page.removeEventListener('dragover', onDragOver);
            page.removeEventListener('dragleave', onDragLeave);
        };
    }, [editor, dragStateRef, setDropTop]);
}
