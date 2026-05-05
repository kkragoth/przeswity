import { create } from 'zustand';

export enum EditorViewKind {
    Live = 'live',
    VersionHistory = 'versionHistory',
}

export enum DiffSideKind {
    Current = 'current',
    Snapshot = 'snapshot',
}

export type DiffSide =
    | { kind: DiffSideKind.Current }
    | { kind: DiffSideKind.Snapshot; id: string };

export const CURRENT_SIDE: DiffSide = { kind: DiffSideKind.Current };
export const snapshotSide = (id: string): DiffSide => ({ kind: DiffSideKind.Snapshot, id });

export const isCurrent = (side: DiffSide) => side.kind === DiffSideKind.Current;
export const sideId = (side: DiffSide) => (side.kind === DiffSideKind.Snapshot ? side.id : null);

export type EditorView =
    | { kind: EditorViewKind.Live }
    | { kind: EditorViewKind.VersionHistory; left: DiffSide; right: DiffSide };

interface EditorViewStore {
    view: EditorView;
    openCompare: (left: DiffSide, right: DiffSide) => void;
    setSide: (which: 'left' | 'right', side: DiffSide) => void;
    swapSides: () => void;
    closeLive: () => void;
}

export const useEditorViewStore = create<EditorViewStore>()((set) => ({
    view: { kind: EditorViewKind.Live },

    openCompare: (left, right) =>
        set({ view: { kind: EditorViewKind.VersionHistory, left, right } }),

    setSide: (which, side) =>
        set((s) =>
            s.view.kind === EditorViewKind.VersionHistory
                ? { view: { ...s.view, [which]: side } }
                : s,
        ),

    swapSides: () =>
        set((s) =>
            s.view.kind === EditorViewKind.VersionHistory
                ? { view: { ...s.view, left: s.view.right, right: s.view.left } }
                : s,
        ),

    closeLive: () => set({ view: { kind: EditorViewKind.Live } }),
}));
