import { useCallback, useRef } from 'react';

export function useStableCallback<T extends (...args: never[]) => unknown>(fn: T): T {
    const ref = useRef<T>(fn);
    ref.current = fn;
    return useCallback((...args: Parameters<T>): ReturnType<T> => ref.current(...args) as ReturnType<T>, []) as T; // stable ref
}
