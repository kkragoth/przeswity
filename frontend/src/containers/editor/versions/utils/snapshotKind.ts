import type { SnapshotSummary } from '@/api/generated/types.gen';

const AUTO_PREFIX = 'auto:';

export enum SnapshotKind {
    Auto = 'auto',
    Manual = 'manual',
}

export function snapshotKind(snap: SnapshotSummary): SnapshotKind {
    return snap.label.startsWith(AUTO_PREFIX) ? SnapshotKind.Auto : SnapshotKind.Manual;
}

export function isAutoSnapshot(snap: SnapshotSummary): boolean {
    return snapshotKind(snap) === SnapshotKind.Auto;
}

export function manualLabel(snap: SnapshotSummary): string | null {
    return isAutoSnapshot(snap) ? null : snap.label;
}
