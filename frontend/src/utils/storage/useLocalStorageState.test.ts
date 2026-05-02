// @vitest-environment jsdom
import { act, createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocalStorageState } from '@/utils/storage/useLocalStorageState';

interface LocalStorageOpts<T> {
    debounceMs?: number;
    serialize?: (v: T) => string;
    deserialize?: (s: string) => T;
}

function makeHarness<T>(key: string, initial: T, opts?: LocalStorageOpts<T>) {
    const host = document.createElement('div');
    const root = createRoot(host);
    let captured: [T, (next: T | ((prev: T) => T)) => void] | undefined;

    function Probe() {
        const result = useLocalStorageState(key, initial, opts);
        captured = result as [T, (next: T | ((prev: T) => T)) => void];
        return null;
    }

    act(() => { root.render(createElement(Probe)); });

    return {
        get value() { return captured![0]; },
        set: (v: T | ((prev: T) => T)) => act(() => { captured![1](v as never); }),
        unmount: () => act(() => { root.unmount(); }),
    };
}

function makeKeyChangingHarness<T>(initialKey: string, initial: T) {
    const host = document.createElement('div');
    const root = createRoot(host);
    let captured: [T, (next: T | ((prev: T) => T)) => void] | undefined;
    let setKey: ((k: string) => void) | undefined;

    function Probe() {
        const [key, setK] = useState(initialKey);
        setKey = setK;
        const result = useLocalStorageState(key, initial);
        captured = result as [T, (next: T | ((prev: T) => T)) => void];
        return null;
    }

    act(() => { root.render(createElement(Probe)); });

    return {
        get value() { return captured![0]; },
        set: (v: T | ((prev: T) => T)) => act(() => { captured![1](v as never); }),
        changeKey: (k: string) => act(() => { setKey!(k); }),
        unmount: () => act(() => { root.unmount(); }),
    };
}

describe('useLocalStorageState', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('reads existing value from localStorage', () => {
        localStorage.setItem('test-key', JSON.stringify({ count: 42 }));
        const harness = makeHarness('test-key', { count: 0 });
        expect(harness.value).toEqual({ count: 42 });
        harness.unmount();
    });

    it('writes new value to localStorage after debounce', () => {
        const harness = makeHarness('debounce-key', 'initial', { debounceMs: 200 });
        harness.set('updated');

        // not yet written
        expect(localStorage.getItem('debounce-key')).toBeNull();

        act(() => { vi.advanceTimersByTime(200); });

        expect(localStorage.getItem('debounce-key')).toBe(JSON.stringify('updated'));
        harness.unmount();
    });

    it('falls back to initial on schema corruption', () => {
        localStorage.setItem('bad-key', 'not valid json {{{');
        const harness = makeHarness('bad-key', 'fallback');
        expect(harness.value).toBe('fallback');
        harness.unmount();
    });

    it('changing the key causes the current in-memory value to be written to the new key', () => {
        localStorage.setItem('key-a', JSON.stringify(10));

        const harness = makeKeyChangingHarness('key-a', 0);
        expect(harness.value).toBe(10);

        // Advance timers so the initial write for key-a completes
        act(() => { vi.advanceTimersByTime(0); });
        expect(localStorage.getItem('key-a')).toBe(JSON.stringify(10));

        harness.changeKey('key-b');
        // In-memory value stays the same (useState initializer only runs on mount)
        expect(harness.value).toBe(10);

        // The effect writes the current value (10) to the new key
        act(() => { vi.advanceTimersByTime(0); });
        expect(localStorage.getItem('key-b')).toBe(JSON.stringify(10));

        harness.unmount();
    });

    it('respects custom serialize and deserialize options', () => {
        const serialize = (v: number) => String(v * 2);
        const deserialize = (s: string) => Number(s) / 2;

        const harness = makeHarness('custom-serde', 5, { serialize, deserialize });
        // On mount: no stored value → initial is 5; effect fires immediately (debounceMs=0)
        act(() => { vi.advanceTimersByTime(0); });

        // serialize(5) = "10" should be written
        expect(localStorage.getItem('custom-serde')).toBe('10');

        harness.set(20);
        act(() => { vi.advanceTimersByTime(0); });

        // serialize(20) = "40"
        expect(localStorage.getItem('custom-serde')).toBe('40');

        // Read fresh: deserialize("40") = 20
        localStorage.setItem('custom-serde-read', '80');
        const harness2 = makeHarness('custom-serde-read', 0, { serialize, deserialize });
        expect(harness2.value).toBe(40); // deserialize("80") = 40

        harness.unmount();
        harness2.unmount();
    });
});
