import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { PAGE_NAV_ACTIVE_LINE_RATIO, PAGE_NAV_TOP_OFFSET_PX } from '@/editor/constants';

export interface PageNavigation {
    current: number;
    total: number;
    jumpTo: (page: number) => void;
}

const PAGE_BREAK_SELECTOR = '.rm-page-break';

function findScrollEl(editor: Editor | null): HTMLElement | null {
    return (editor?.view.dom.closest('.editor-scroll') as HTMLElement | null) ?? null;
}

function pageBreaks(editor: Editor): HTMLElement[] {
    return Array.from(editor.view.dom.querySelectorAll<HTMLElement>(PAGE_BREAK_SELECTOR));
}

function pageContainerOf(editor: Editor): HTMLElement | null {
    return (editor.view.dom.querySelector('[data-rm-pagination]') as HTMLElement | null) ?? null;
}

function offsetTopWithin(target: HTMLElement, scrollEl: HTMLElement): number {
    let top = 0;
    let node: HTMLElement | null = target;
    while (node && node !== scrollEl) {
        top += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
    }
    return top;
}

function activePageFor(scrollEl: HTMLElement, breaks: HTMLElement[]): number {
    if (breaks.length === 0) return 1;
    const activeLine = scrollEl.scrollTop + scrollEl.clientHeight * PAGE_NAV_ACTIVE_LINE_RATIO;
    let active = 1;
    for (let i = 0; i < breaks.length; i++) {
        if (offsetTopWithin(breaks[i], scrollEl) <= activeLine) active = i + 1;
        else break;
    }
    return active;
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
            const breaks = pageBreaks(editor);
            const total = Math.max(1, breaks.length);
            const current = Math.min(activePageFor(scrollEl, breaks), total);
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

        const container = pageContainerOf(editor);
        const observer = container
            ? new MutationObserver(schedule)
            : null;
        observer?.observe(container as HTMLElement, { childList: true, subtree: true });

        return () => {
            cancelAnimationFrame(raf);
            scrollEl.removeEventListener('scroll', schedule);
            editor.off('update', schedule);
            observer?.disconnect();
        };
    }, [editor]);

    const jumpTo = useCallback((page: number) => {
        if (!editor) return;
        const scrollEl = scrollRef.current ?? findScrollEl(editor);
        if (!scrollEl) return;
        const breaks = pageBreaks(editor);
        if (breaks.length === 0) {
            scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        const clamped = Math.max(1, Math.min(page, breaks.length));
        const target = breaks[clamped - 1];
        const top = Math.max(0, offsetTopWithin(target, scrollEl) - PAGE_NAV_TOP_OFFSET_PX);
        scrollEl.scrollTo({ top, behavior: 'smooth' });
    }, [editor]);

    return { current: state.current, total: state.total, jumpTo };
}
