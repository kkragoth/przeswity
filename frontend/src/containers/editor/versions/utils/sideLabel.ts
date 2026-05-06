import { isCurrent, type DiffSide } from '@/containers/editor/session/editorViewStore';
import type { SnapshotSummary } from '@/api/generated/types.gen';
import { isAutoSnapshot } from './snapshotKind';
import { relativeTime, shortTime, type TimeLabels } from './friendlyTime';

export function sideLabel(side: DiffSide, snapshots: SnapshotSummary[], currentLabel: string): string {
    if (isCurrent(side)) return currentLabel;
    const snap = snapshots.find((s) => s.id === side.id);
    if (!snap) return side.id;
    return isAutoSnapshot(snap) ? snap.createdAt : snap.label;
}

export function friendlySideLabel(
    side: DiffSide,
    snapshots: SnapshotSummary[],
    currentLabel: string,
    timeLabels: TimeLabels,
): string {
    if (isCurrent(side)) return currentLabel;
    const snap = snapshots.find((s) => s.id === side.id);
    if (!snap) return side.id;
    if (isAutoSnapshot(snap)) return relativeTime(snap.createdAt, timeLabels);
    return `${snap.label} · ${shortTime(snap.createdAt)}`;
}
