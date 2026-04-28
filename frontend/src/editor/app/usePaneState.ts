import { useCallback, useEffect, useState } from 'react';

export type PaneState = 'expanded' | 'rail' | 'hidden'
export type PaneSide = 'left' | 'right'

const ORDER: PaneState[] = ['expanded', 'rail', 'hidden'];

const storageKey = (side: PaneSide) => `editor.pane.${side}`;

function readInitial(side: PaneSide, fallback: PaneState): PaneState {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(storageKey(side));
    if (raw === 'expanded' || raw === 'rail' || raw === 'hidden') return raw;
    return fallback;
}

export interface PaneStateApi {
    state: PaneState
    setState: (next: PaneState) => void
    cycle: () => void
    expand: () => void
    rail: () => void
    hide: () => void
    isExpanded: boolean
    isRail: boolean
    isHidden: boolean
}

export function usePaneState(side: PaneSide, fallback: PaneState = 'expanded'): PaneStateApi {
    const [state, setStateRaw] = useState<PaneState>(() => readInitial(side, fallback));

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(storageKey(side), state);
    }, [side, state]);

    const setState = useCallback((next: PaneState) => setStateRaw(next), []);
    const cycle = useCallback(
        () => setStateRaw((current) => ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]),
        [],
    );

    return {
        state,
        setState,
        cycle,
        expand: useCallback(() => setStateRaw('expanded'), []),
        rail: useCallback(() => setStateRaw('rail'), []),
        hide: useCallback(() => setStateRaw('hidden'), []),
        isExpanded: state === 'expanded',
        isRail: state === 'rail',
        isHidden: state === 'hidden',
    };
}
