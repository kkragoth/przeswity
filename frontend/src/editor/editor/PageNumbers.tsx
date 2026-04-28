import '@/editor/editor/page-numbers.css';
import { PAGE_HEIGHT_PX, PAGE_MARGIN_Y_PX, pageTop } from './pageLayout';

interface Props {
    pageCount: number
}

function pageBottomOffset(pageIndex: number): number {
    // Position near the bottom of each page slot, inside the page margin
    return pageTop(pageIndex) + PAGE_HEIGHT_PX - PAGE_MARGIN_Y_PX + 22;
}

export function PageNumbers({ pageCount }: Props) {
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
