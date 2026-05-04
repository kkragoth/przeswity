import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { readEffectiveZoom } from '@/contexts/EditorZoomContext';

export interface HoveredBlock {
  pos: number
  top: number
}

export const BLOCK_SELECTORS =
  'p, h1, h2, h3, h4, h5, h6, blockquote, pre, ul, ol, hr, table, [data-type="taskList"], [data-toc]';

/**
 * Tracks the top-level block currently under the mouse, returning its
 * ProseMirror position (just inside the block) and pixel offset relative to
 * `.editor-page`. Used by the drag-handle UI.
 */
export function useBlockHover(
    editor: Editor | null,
    selectors: string = BLOCK_SELECTORS,
): HoveredBlock | null {
    const [hovered, setHovered] = useState<HoveredBlock | null>(null);
    useEffect(() => {
        if (!editor) return;
        const view = editor.view;
        const dom = view.dom as HTMLElement;
        const page = dom.closest('.editor-page') as HTMLElement | null;
        if (!page) return;

        let raf = 0;
        const onMove = (e: MouseEvent) => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const target = e.target as HTMLElement;
                if (!dom.contains(target)) return;
                const block = target.closest(selectors) as HTMLElement | null;
                if (!block || !dom.contains(block)) return;
                const blockRect = block.getBoundingClientRect();
                const pageRect = page.getBoundingClientRect();
                const zoom = readEffectiveZoom(page);
                try {
                    const pos = view.posAtDOM(block, 0);
                    setHovered({ pos, top: (blockRect.top - pageRect.top) / zoom });
                } catch {
                    /* DOM not in editor */
                }
            });
        };

        dom.addEventListener('mousemove', onMove);
        return () => {
            cancelAnimationFrame(raf);
            dom.removeEventListener('mousemove', onMove);
        };
    }, [editor, selectors]);
    return hovered;
}
