import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';

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

/**
 * Compute pin tops in the coord space of `.editor-zoom-frame` (sibling of the
 * page, same size as the scaled page but without the transform). Because the
 * frame is part of scroll content, pins scroll with the doc automatically —
 * no scroll listener needed. And because the frame has no transform, the
 * pin's CSS top is in native pixels and `spanRect.top - frameRect.top` lines
 * up with the span's viewport y at any editor zoom.
 */
function placePins(
    dom: HTMLElement,
    frameRect: DOMRect,
    openThreads: OpenThread[],
    minGapPx: number,
): PinAnchor[] {
    const placed: PinAnchor[] = [];
    const seen = new Set<string>();
    for (const th of openThreads) {
        if (seen.has(th.id)) continue;
        const span = dom.querySelector(`[data-comment-id="${CSS.escape(th.id)}"]`) as HTMLElement | null;
        if (!span) continue;
        seen.add(th.id);
        const r = span.getBoundingClientRect();
        placed.push({ ...th, top: r.top - frameRect.top });
    }
    placed.sort((a, b) => a.top - b.top);
    for (let i = 1; i < placed.length; i++) {
        if (pinsAreOverlapping(placed[i - 1].top, placed[i].top, minGapPx)) {
            placed[i].top = placed[i - 1].top + minGapPx;
        }
    }
    return placed;
}

function pinsAreOverlapping(prevTop: number, currTop: number, minGapPx: number): boolean {
    return currTop - prevTop < minGapPx;
}

export function useCommentPinPositions(
    editor: Editor | null,
    openThreads: OpenThread[],
    minGapPx: number,
): PinAnchor[] {
    const [pins, setPins] = useState<PinAnchor[]>([]);

    useEffect(() => {
        if (!editor) return;
        const dom = editor.view.dom as HTMLElement;
        const frame = dom.closest('.editor-zoom-frame') as HTMLElement | null;
        if (!frame) return;

        let raf = 0;
        const compute = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                setPins(placePins(dom, frame.getBoundingClientRect(), openThreads, minGapPx));
            });
        };
        compute();
        editor.on('update', compute);
        window.addEventListener('resize', compute);

        // Doc reflows that don't fire `update` still move the anchored spans:
        // font load, PaginationPlus inserting page breaks, images settling,
        // zoom toggles. Watch the frame and the prosemirror dom for size
        // changes and recompute.
        const ro = new ResizeObserver(compute);
        ro.observe(frame);
        ro.observe(dom);

        return () => {
            cancelAnimationFrame(raf);
            editor.off('update', compute);
            window.removeEventListener('resize', compute);
            ro.disconnect();
        };
    }, [editor, openThreads, minGapPx]);

    return pins;
}
