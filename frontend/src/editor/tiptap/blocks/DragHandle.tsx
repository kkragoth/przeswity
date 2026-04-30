import type { Editor } from '@tiptap/react';
import type { HoveredBlock } from '@/editor/tiptap/hooks/useBlockHover';
import type { DragState } from '@/editor/tiptap/hooks/useBlockDragDrop';
import type { MutableRefObject } from 'react';

interface DragHandleProps {
  editor: Editor
  hovered: HoveredBlock
  dragStateRef: MutableRefObject<DragState>
  onClickMenu: (pos: number, anchor: DOMRect) => void
  onDragEnd: () => void
}

export function DragHandle({
    editor,
    hovered,
    dragStateRef,
    onClickMenu,
    onDragEnd,
}: DragHandleProps) {
    return (
        <button
            type="button"
            className="block-handle"
            style={{ top: hovered.top }}
            draggable
            onClick={(e) => {
                e.stopPropagation();
                onClickMenu(hovered.pos, (e.currentTarget as HTMLElement).getBoundingClientRect());
            }}
            onDragStart={(e) => {
                try {
                    const view = editor.view;
                    const $pos = view.state.doc.resolve(hovered.pos);
                    if ($pos.depth < 1) return;
                    const from = $pos.before(1);
                    const to = $pos.after(1);
                    const node = $pos.node(1);
                    dragStateRef.current = { from, to, insertAt: null, active: true };
                    if (e.dataTransfer) {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', node.textContent.slice(0, 80) || ' ');
                        const blockEl = view.nodeDOM(from) as HTMLElement | null;
                        if (blockEl) {
                            const rect = blockEl.getBoundingClientRect();
                            e.dataTransfer.setDragImage(
                                blockEl,
                                Math.min(20, rect.width / 2),
                                Math.min(20, rect.height / 2),
                            );
                        }
                    }
                } catch (err) {
                    console.error('dragstart failed:', err);
                }
            }}
            onDragEnd={onDragEnd}
            title="Drag to move · click for menu"
        >
      ⠿
        </button>
    );
}
