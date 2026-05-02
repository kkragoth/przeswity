import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

interface UseLocalStorageStateOpts<T> {
    debounceMs?: number;
    serialize?: (v: T) => string;
    deserialize?: (s: string) => T;
}

function defaultSerialize<T>(v: T): string {
    return JSON.stringify(v);
}

function defaultDeserialize<T>(s: string): T {
    return JSON.parse(s) as T;
}

export function useLocalStorageState<T>(
    key: string,
    initial: T,
    opts?: UseLocalStorageStateOpts<T>,
): [T, Dispatch<SetStateAction<T>>] {
    const serialize = opts?.serialize ?? defaultSerialize;
    const deserialize = opts?.deserialize ?? defaultDeserialize;
    const debounceMs = opts?.debounceMs ?? 0;

    const [value, setValue] = useState<T>(() => {
        try {
            const raw = localStorage.getItem(key);
            if (raw !== null) return deserialize(raw);
        } catch {
            // schema corruption or parse error — fall through to initial
        }
        return initial;
    });

    useEffect(() => {
        const id = setTimeout(() => {
            try {
                localStorage.setItem(key, serialize(value));
            } catch {
                // storage full or unavailable — ignore
            }
        }, debounceMs);
        return () => clearTimeout(id);
    }, [key, value, serialize, debounceMs]);

    return [value, setValue];
}
