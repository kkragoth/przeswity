export const PAGE_HEIGHT_PX = 1123; // A4 height at 96dpi.
export const PAGE_MARGIN_Y_PX = 96; // Word "Normal" 1in top/bottom margins.
export const PAGE_GAP_PX = 32;

export const PAGE_SLOT_HEIGHT_PX = PAGE_HEIGHT_PX + PAGE_GAP_PX;
export const PAGE_CONTENT_HEIGHT_PX = PAGE_HEIGHT_PX - PAGE_MARGIN_Y_PX * 2;

export function pageTop(pageIndex: number): number {
    return pageIndex * PAGE_SLOT_HEIGHT_PX;
}

export function pageContentTop(pageIndex: number): number {
    return pageTop(pageIndex) + PAGE_MARGIN_Y_PX;
}

export function pageContentBottom(pageIndex: number): number {
    return pageTop(pageIndex) + PAGE_HEIGHT_PX - PAGE_MARGIN_Y_PX;
}

export function pageStackHeight(pageCount: number): number {
    return Math.max(1, pageCount) * PAGE_HEIGHT_PX + Math.max(0, pageCount - 1) * PAGE_GAP_PX;
}
