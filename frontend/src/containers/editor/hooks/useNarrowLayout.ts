import { useEffect, useState } from 'react';

export const NARROW_BREAKPOINT_PX = 1100;

function isNarrow(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= NARROW_BREAKPOINT_PX;
}

export function useNarrowLayout(): boolean {
    const [narrow, setNarrow] = useState<boolean>(() => isNarrow());

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${NARROW_BREAKPOINT_PX}px)`);
        const onChange = () => setNarrow(mq.matches);
        onChange();
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    return narrow;
}
