import { useState } from 'react';

interface BlockMenuAnchor {
    pos: number;
    rect: DOMRect;
}

export function useBlockMenu() {
    const [openAt, setOpenAt] = useState<BlockMenuAnchor | null>(null);
    return {
        openAt,
        openFor: (rect: DOMRect, pos: number) => setOpenAt({ rect, pos }),
        close: () => setOpenAt(null),
        isOpen: openAt !== null,
    };
}
