import { useNavigate } from '@tanstack/react-router';
import {
    useEditorViewStore,
    DiffSideKind,
    EditorViewKind,
    type DiffSide,
} from '@/containers/editor/session/editorViewStore';

const CURRENT_KEYWORD = 'current';

const sideToParam = (side: DiffSide): string =>
    side.kind === DiffSideKind.Current ? CURRENT_KEYWORD : side.id;

type SearchUpdate = { left?: string; right?: string };

/**
 * Keeps the Zustand editorViewStore and the URL search params in sync.
 * Uses search-only navigation (no `to`) so the route component never remounts.
 */
export function useVersionNavigation() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const navigate = useNavigate() as (opts: { search: any }) => void;
    const store = useEditorViewStore;

    const nav = (search: SearchUpdate) => navigate({ search });

    const sync = (left: DiffSide, right: DiffSide) =>
        nav({ left: sideToParam(left), right: sideToParam(right) });

    return {
        openCompare(left: DiffSide, right: DiffSide) {
            store.getState().openCompare(left, right);
            sync(left, right);
        },
        setSide(which: 'left' | 'right', side: DiffSide) {
            store.getState().setSide(which, side);
            const v = store.getState().view;
            if (v.kind === EditorViewKind.VersionHistory) sync(v.left, v.right);
        },
        swap() {
            store.getState().swapSides();
            const v = store.getState().view;
            if (v.kind === EditorViewKind.VersionHistory) sync(v.left, v.right);
        },
        close() {
            store.getState().closeLive();
            nav({});
        },
    };
}
