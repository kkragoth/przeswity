import { useEffect, useRef, useState } from 'react';
import '@/editor/editor/page-numbers.css';

const PAGE_HEIGHT_PX = 1100;
const PAGE_MARGIN_Y_PX = 80;

interface Props {
    containerRef: React.RefObject<HTMLDivElement | null>
}

function computePageCount(containerHeight: number): number {
    const contentHeight = containerHeight - PAGE_MARGIN_Y_PX * 2;
    return Math.max(1, Math.ceil(contentHeight / PAGE_HEIGHT_PX));
}

function pageBottomOffset(pageIndex: number): number {
    // Position near the bottom of each page slot, inside the page margin
    return PAGE_MARGIN_Y_PX + (pageIndex + 1) * PAGE_HEIGHT_PX - 16;
}

export function PageNumbers({ containerRef }: Props) {
    const [pageCount, setPageCount] = useState(1);
    const observerRef = useRef<ResizeObserver | null>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const update = () => setPageCount(computePageCount(el.offsetHeight));
        update();

        observerRef.current = new ResizeObserver(update);
        observerRef.current.observe(el);

        return () => observerRef.current?.disconnect();
    }, [containerRef]);

    const pages = Array.from({ length: pageCount }, (_, i) => i);

    return (
        <div className="page-numbers" aria-hidden="true">
            {pages.map((i) => (
                <span
                    key={i}
                    className="page-number"
                    style={{ top: pageBottomOffset(i) }}
                >
                    {i + 1}
                </span>
            ))}
        </div>
    );
}
