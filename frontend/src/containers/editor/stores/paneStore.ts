import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export enum PaneState {
    Expanded = 'expanded',
    Rail = 'rail',
    Hidden = 'hidden',
}

export type PaneSide = 'left' | 'right';

interface PaneStore {
    left: PaneState;
    right: PaneState;
    set: (side: PaneSide, state: PaneState) => void;
    expand: (side: PaneSide) => void;
    hide: (side: PaneSide) => void;
    rail: (side: PaneSide) => void;
    cycle: (side: PaneSide) => void;
    toggle: (side: PaneSide, narrow: boolean) => void;
    showSide: (side: PaneSide, narrow: boolean) => void;
    dismissBoth: () => void;
}

const nextCycle = (current: PaneState): PaneState =>
    current === PaneState.Expanded ? PaneState.Hidden : PaneState.Expanded;

const opposite = (side: PaneSide): PaneSide => (side === 'left' ? 'right' : 'left');

export const usePaneStore = create<PaneStore>()(
    persist(
        (set, get) => ({
            left: PaneState.Expanded,
            right: PaneState.Expanded,
            set: (side, state) => set({ [side]: state }),
            expand: (side) => set({ [side]: PaneState.Expanded }),
            hide: (side) => set({ [side]: PaneState.Hidden }),
            rail: (side) => set({ [side]: PaneState.Rail }),
            cycle: (side) => set((s) => ({ [side]: nextCycle(s[side]) })),
            showSide: (side, narrow) =>
                set(narrow
                    ? { [side]: PaneState.Expanded, [opposite(side)]: PaneState.Hidden }
                    : { [side]: PaneState.Expanded }),
            toggle: (side, narrow) => {
                if (!narrow) {
                    set((s) => ({ [side]: nextCycle(s[side]) }));
                    return;
                }
                if (get()[side] === PaneState.Expanded) {
                    set({ [side]: PaneState.Hidden });
                    return;
                }
                get().showSide(side, true);
            },
            dismissBoth: () => set({ left: PaneState.Hidden, right: PaneState.Hidden }),
        }),
        { name: 'editor.panes', version: 1 },
    ),
);

export const paneClass = (side: PaneSide, state: PaneState): string =>
    state === PaneState.Expanded ? `pane-${side}-open` : `pane-${side}-${state}`;
