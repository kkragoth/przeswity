import { useCallback, useEffect, useState } from 'react';

export enum PaneState {
    Expanded = 'expanded',
    Rail = 'rail',
    Hidden = 'hidden',
}
export type PaneSide = 'left' | 'right'

const storageKey = (side: PaneSide) => `editor.pane.${side}`;

function readInitial(side: PaneSide, fallback: PaneState): PaneState {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(storageKey(side));
    if (raw === PaneState.Expanded || raw === PaneState.Rail || raw === PaneState.Hidden) return raw as PaneState;
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

export function usePaneState(side: PaneSide, fallback: PaneState = PaneState.Expanded): PaneStateApi {
    const [state, setStateRaw] = useState<PaneState>(() => readInitial(side, fallback));

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(storageKey(side), state);
    }, [side, state]);

    const setState = useCallback((next: PaneState) => setStateRaw(next), []);
    const cycle = useCallback(
        () => setStateRaw((current) => (current === PaneState.Expanded ? PaneState.Hidden : PaneState.Expanded)),
        [],
    );

    return {
        state,
        setState,
        cycle,
        expand: useCallback(() => setStateRaw(PaneState.Expanded), []),
        rail: useCallback(() => setStateRaw(PaneState.Rail), []),
        hide: useCallback(() => setStateRaw(PaneState.Hidden), []),
        isExpanded: state === PaneState.Expanded,
        isRail: state === PaneState.Rail,
        isHidden: state === PaneState.Hidden,
    };
}
