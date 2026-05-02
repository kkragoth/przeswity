import { useLocalStorageState } from '@/utils/storage/useLocalStorageState';

export enum PaneState {
    Expanded = 'expanded',
    Rail = 'rail',
    Hidden = 'hidden',
}
export type PaneSide = 'left' | 'right'

const storageKey = (side: PaneSide) => `editor.pane.${side}`;

export function readPaneState(side: PaneSide, fallback: PaneState = PaneState.Expanded): PaneState {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(storageKey(side));
    if (raw === PaneState.Expanded || raw === PaneState.Rail || raw === PaneState.Hidden) return raw as PaneState;
    return fallback;
}

/** Returns a CSS class name string based on pane state. */
export function paneClass(state: PaneState): string {
    return `pane-${state}`;
}

function deserializePaneState(raw: string): PaneState {
    if (raw === PaneState.Expanded || raw === PaneState.Rail || raw === PaneState.Hidden) return raw as PaneState;
    throw new Error(`Unknown pane state: ${raw}`);
}

export interface PaneStateApi {
    state: PaneState
    setState: (next: PaneState) => void
    cycle: () => void
    expand: () => void
    rail: () => void
    hide: () => void
}

export function usePaneState(side: PaneSide, fallback: PaneState = PaneState.Expanded): PaneStateApi {
    const [state, setStateRaw] = useLocalStorageState<PaneState>(
        storageKey(side),
        fallback,
        { deserialize: deserializePaneState },
    );

    const setState = (next: PaneState) => setStateRaw(next);
    const cycle = () => setStateRaw((current) => (current === PaneState.Expanded ? PaneState.Hidden : PaneState.Expanded));
    const expand = () => setStateRaw(PaneState.Expanded);
    const rail = () => setStateRaw(PaneState.Rail);
    const hide = () => setStateRaw(PaneState.Hidden);

    return { state, setState, cycle, expand, rail, hide };
}
