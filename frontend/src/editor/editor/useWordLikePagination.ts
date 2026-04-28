import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { CSSProperties } from 'react';
import {
    PAGE_CONTENT_HEIGHT_PX,
    PAGE_GAP_PX,
    PAGE_HEIGHT_PX,
    PAGE_MARGIN_Y_PX,
    pageContentBottom,
    pageContentTop,
} from './pageLayout';

const BREAK_CLASS = 'pm-page-break-before';
const BREAK_VAR = '--pm-page-break-before';

function directContentBlocks(root: HTMLElement): HTMLElement[] {
    return Array.from(root.children).filter((child): child is HTMLElement => {
        if (!(child instanceof HTMLElement)) return false;
        if (child.dataset.paginationIgnore === 'true') return false;
        return child.offsetParent !== null;
    });
}

function clearBreaks(blocks: HTMLElement[]) {
    for (const block of blocks) {
        block.classList.remove(BREAK_CLASS);
        block.style.removeProperty(BREAK_VAR);
        block.removeAttribute('data-page-number');
    }
}

function pageCountFromBottom(bottom: number): number {
    let pages = 1;
    while (bottom > pageContentBottom(pages - 1)) pages += 1;
    return pages;
}

function paginate(root: HTMLElement): number {
    const blocks = directContentBlocks(root);
    clearBreaks(blocks);

    // Force layout after removing old break spacers, otherwise measurements drift.
    void root.offsetHeight;

    let pageIndex = 0;
    let lastBottom = PAGE_MARGIN_Y_PX;

    for (const block of blocks) {
        const blockHeight = block.offsetHeight;
        let top = block.offsetTop;
        let visualTop = top;
        let bottom = visualTop + blockHeight;
        const contentTop = pageContentTop(pageIndex);
        const contentBottom = pageContentBottom(pageIndex);
        const canMoveWholeBlock = blockHeight <= PAGE_CONTENT_HEIGHT_PX;

        if (visualTop < contentTop) {
            const spacer = contentTop - top;
            block.classList.add(BREAK_CLASS);
            block.style.setProperty(BREAK_VAR, `${spacer}px`);
            visualTop = contentTop;
            bottom = visualTop + blockHeight;
        }

        if (bottom > contentBottom && visualTop > contentTop && canMoveWholeBlock) {
            const spacer = Math.max(0, pageContentTop(pageIndex + 1) - top);
            block.classList.add(BREAK_CLASS);
            block.style.setProperty(BREAK_VAR, `${spacer}px`);
            pageIndex += 1;
            visualTop = pageContentTop(pageIndex);
            bottom = visualTop + blockHeight;
        }

        while (bottom > pageContentBottom(pageIndex)) {
            pageIndex += 1;
        }

        block.setAttribute('data-page-number', String(pageIndex + 1));
        lastBottom = Math.max(lastBottom, bottom);
    }

    return pageCountFromBottom(lastBottom + PAGE_MARGIN_Y_PX);
}

export function useWordLikePagination(editor: Editor | null): number {
    const [pageCount, setPageCount] = useState(1);

    useEffect(() => {
        if (!editor) return;

        const root = editor.view.dom as HTMLElement;
        let raf = 0;
        let disposed = false;

        const schedule = () => {
            if (disposed) return;
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                raf = 0;
                const next = paginate(root);
                setPageCount((current) => (current === next ? current : next));
            });
        };

        const onImageLoad = (event: Event) => {
            if (event.target instanceof HTMLImageElement) schedule();
        };

        editor.on('create', schedule);
        editor.on('update', schedule);
        editor.on('transaction', schedule);
        window.addEventListener('resize', schedule);
        root.addEventListener('load', onImageLoad, true);
        schedule();

        void document.fonts?.ready.then(schedule).catch(() => {});

        return () => {
            disposed = true;
            if (raf) cancelAnimationFrame(raf);
            editor.off('create', schedule);
            editor.off('update', schedule);
            editor.off('transaction', schedule);
            window.removeEventListener('resize', schedule);
            root.removeEventListener('load', onImageLoad, true);
            clearBreaks(directContentBlocks(root));
        };
    }, [editor]);

    return pageCount;
}

export const pageCssVars = {
    '--page-height-px': `${PAGE_HEIGHT_PX}px`,
    '--page-margin-y-px': `${PAGE_MARGIN_Y_PX}px`,
    '--page-gap-px': `${PAGE_GAP_PX}px`,
} as CSSProperties;
