// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocalStorageState } from '@/utils/storage/useLocalStorageState';

function makeHarness<T>(key: string, initial: T, debounceMs?: number) {
    const host = document.createElement('div');
    const root = createRoot(host);
    let captured: [T, (next: T | ((prev: T) => T)) => void] | undefined;

    function Probe() {
        const result = useLocalStorageState(key, initial, debounceMs !== undefined ? { debounceMs } : undefined);
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
        const harness = makeHarness('debounce-key', 'initial', 200);
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
});
