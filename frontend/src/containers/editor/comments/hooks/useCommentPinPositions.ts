import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { COMMENT_PIN_GAP_PX } from '@/editor/constants';
import { readEffectiveZoom } from '@/contexts/EditorZoomContext';

export interface PinAnchor {
    id: string;
    top: number;
    authorName: string;
    authorColor: string;
    replies: number;
}

export interface OpenThread {
    id: string;
    authorName: string;
    authorColor: string;
    replies: number;
}

function placePins(dom: HTMLElement, pageRect: DOMRect, zoom: number, openThreads: OpenThread[]): PinAnchor[] {
    const placed: PinAnchor[] = [];
    const seen = new Set<string>();
    for (const th of openThreads) {
        if (seen.has(th.id)) continue;
        const span = dom.querySelector(`[data-comment-id="${CSS.escape(th.id)}"]`) as HTMLElement | null;
        if (!span) continue;
        seen.add(th.id);
        const r = span.getBoundingClientRect();
        placed.push({ ...th, top: (r.top - pageRect.top) / zoom });
    }
    placed.sort((a, b) => a.top - b.top);
    for (let i = 1; i < placed.length; i++) {
        if (pinsAreOverlapping(placed[i - 1].top, placed[i].top)) {
            placed[i].top = placed[i - 1].top + COMMENT_PIN_GAP_PX;
        }
    }
    return placed;
}

function pinsAreOverlapping(prevTop: number, currTop: number): boolean {
    return currTop - prevTop < COMMENT_PIN_GAP_PX;
}

export function useCommentPinPositions(editor: Editor | null, openThreads: OpenThread[]): PinAnchor[] {
    const [pins, setPins] = useState<PinAnchor[]>([]);

    useEffect(() => {
        if (!editor) return;
        let raf = 0;
        const compute = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const dom = editor.view.dom as HTMLElement;
                const page = dom.closest('.editor-page') as HTMLElement | null;
                if (!page) return;
                setPins(placePins(dom, page.getBoundingClientRect(), readEffectiveZoom(page), openThreads));
            });
        };
        compute();
        const onTr = () => compute();
        editor.on('transaction', onTr);
        window.addEventListener('resize', compute);
        return () => {
            cancelAnimationFrame(raf);
            editor.off('transaction', onTr);
            window.removeEventListener('resize', compute);
        };
    }, [editor, openThreads]);

    return pins;
}
