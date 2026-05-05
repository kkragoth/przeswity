import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export enum PaneState {
    Expanded = 'expanded',
    Rail = 'rail',
    Hidden = 'hidden',
}

export enum PinsMode {
    Off = 'off',
    Avatars = 'avatars',
    Full = 'full',
}

export enum PinsSide {
    Left = 'left',
    Right = 'right',
}

export type PaneSide = 'left' | 'right';

interface PaneStore {
    left: PaneState;
    right: PaneState;
    pinsMode: PinsMode;
    pinsSide: PinsSide;
    set: (side: PaneSide, state: PaneState) => void;
    expand: (side: PaneSide) => void;
    hide: (side: PaneSide) => void;
    rail: (side: PaneSide) => void;
    cycle: (side: PaneSide) => void;
    toggle: (side: PaneSide, narrow: boolean) => void;
    showSide: (side: PaneSide, narrow: boolean) => void;
    dismissBoth: () => void;
    cyclePinsMode: () => void;
    togglePinsSide: () => void;
}

const nextCycle = (current: PaneState): PaneState =>
    current === PaneState.Expanded ? PaneState.Hidden : PaneState.Expanded;

const opposite = (side: PaneSide): PaneSide => (side === 'left' ? 'right' : 'left');

const PINS_CYCLE: PinsMode[] = [PinsMode.Full, PinsMode.Avatars, PinsMode.Off];

export const usePaneStore = create<PaneStore>()(
    persist(
        (set, get) => ({
            left: PaneState.Expanded,
            right: PaneState.Expanded,
            pinsMode: PinsMode.Full,
            pinsSide: PinsSide.Right,
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
            cyclePinsMode: () => set((s) => {
                const idx = PINS_CYCLE.indexOf(s.pinsMode);
                return { pinsMode: PINS_CYCLE[(idx + 1) % PINS_CYCLE.length] };
            }),
            togglePinsSide: () => set((s) => ({
                pinsSide: s.pinsSide === PinsSide.Right ? PinsSide.Left : PinsSide.Right,
            })),
        }),
        { name: 'editor.panes', version: 3 },
    ),
);

const STATE_SUFFIX: Record<PaneState, string> = {
    [PaneState.Expanded]: 'open',
    [PaneState.Rail]: 'rail',
    [PaneState.Hidden]: 'hidden',
};

export const paneClass = (side: PaneSide, state: PaneState): string =>
    `pane-${side}-${STATE_SUFFIX[state]}`;
