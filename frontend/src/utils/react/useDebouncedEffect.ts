import { useEffect, useRef } from 'react';

export function useDebouncedEffect(fn: () => void, ms: number, deps: readonly unknown[]): void {
    const fnRef = useRef(fn);
    fnRef.current = fn;
    useEffect(() => {
        const id = window.setTimeout(() => fnRef.current(), ms);
        return () => window.clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, ms]);
}
