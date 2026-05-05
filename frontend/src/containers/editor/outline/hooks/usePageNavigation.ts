import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { PAGE_NAV_ACTIVE_LINE_RATIO, PAGE_NAV_TOP_OFFSET_PX } from '@/editor/constants';

export interface PageNavigation {
    current: number;
    total: number;
    jumpTo: (page: number) => void;
}

// .rm-page-break containers have floated children so they collapse to 0 height
// and all report the same top position. Use the gap dividers instead — each
// sits at the actual visual page boundary and has a real y-coordinate.
// N pages → N-1 visible gaps (last child's gap is display:none via plugin CSS).
const PAGE_GAP_SELECTOR = '.rm-page-break:not(:last-child) .rm-pagination-gap';

function findScrollEl(editor: Editor | null): HTMLElement | null {
    return (editor?.view.dom.closest('.editor-scroll') as HTMLElement | null) ?? null;
}

function pageGaps(editor: Editor): HTMLElement[] {
    return Array.from(editor.view.dom.querySelectorAll<HTMLElement>(PAGE_GAP_SELECTOR));
}

// gaps are the N-1 dividers between N pages.
// When gap[i]'s viewport top passes the active line, we've entered page i+2.
// scrollRect is read once outside the loop to avoid repeated forced reflows.
// getBoundingClientRect gives visual (post-transform) coords so this works
// correctly even when .editor-page has transform: scale(--editor-zoom).
function activePageFor(scrollEl: HTMLElement, gaps: HTMLElement[]): number {
    if (gaps.length === 0) return 1;
    const scrollRectTop = scrollEl.getBoundingClientRect().top;
    const activeLineViewport = scrollRectTop + scrollEl.clientHeight * PAGE_NAV_ACTIVE_LINE_RATIO;
    let active = 1;
    for (let i = 0; i < gaps.length; i++) {
        if (gaps[i].getBoundingClientRect().top <= activeLineViewport) active = i + 2;
        else break;
    }
    return active;
}

function scrollToGap(target: HTMLElement, scrollEl: HTMLElement): void {
    const scrollRectTop = scrollEl.getBoundingClientRect().top;
    const top = Math.max(0, target.getBoundingClientRect().top - scrollRectTop + scrollEl.scrollTop - PAGE_NAV_TOP_OFFSET_PX);
    scrollEl.scrollTo({ top, behavior: 'instant' });
}

export function usePageNavigation(editor: Editor | null): PageNavigation {
    const [state, setState] = useState({ current: 1, total: 1 });
    const scrollRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!editor) return;
        const scrollEl = findScrollEl(editor);
        scrollRef.current = scrollEl;
        if (!scrollEl) return;

        const recompute = () => {
            const gaps = pageGaps(editor);
            const total = Math.max(1, gaps.length + 1);
            const current = Math.min(activePageFor(scrollEl, gaps), total);
            setState((prev) => (prev.current === current && prev.total === total ? prev : { current, total }));
        };

        let raf = 0;
        const schedule = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(recompute);
        };

        recompute();
        scrollEl.addEventListener('scroll', schedule, { passive: true });
        editor.on('update', schedule);

        // PaginationPlus sets editor.view.dom.style.minHeight at the end of every
        // pagination cycle (refreshPage). ResizeObserver fires on that change,
        // giving us a reliable signal that the final page count is in the DOM.
        // This is more robust than MutationObserver on [data-rm-pagination], which
        // gets recreated by ProseMirror on each doc change and goes stale.
        const resizeObserver = new ResizeObserver(schedule);
        resizeObserver.observe(editor.view.dom);

        return () => {
            cancelAnimationFrame(raf);
            scrollEl.removeEventListener('scroll', schedule);
            editor.off('update', schedule);
            resizeObserver.disconnect();
        };
    }, [editor]);

    const jumpTo = useCallback((page: number) => {
        if (!editor) return;
        const scrollEl = scrollRef.current ?? findScrollEl(editor);
        if (!scrollEl) return;
        const gaps = pageGaps(editor);
        const total = Math.max(1, gaps.length + 1);
        const clamped = Math.max(1, Math.min(page, total));
        if (clamped === 1) {
            scrollEl.scrollTo({ top: 0, behavior: 'instant' });
            return;
        }
        const target = gaps[clamped - 2];
        if (!target) return;
        scrollToGap(target, scrollEl);
    }, [editor]);

    return { current: state.current, total: state.total, jumpTo };
}
