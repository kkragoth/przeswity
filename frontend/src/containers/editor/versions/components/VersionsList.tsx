import type { VersionSnapshot as VersionSnapshotType } from '@/editor/versions/types';
import { VersionSnapshot } from './VersionSnapshot';

interface VersionsListProps {
    versions: VersionSnapshotType[];
    compareSourceId: string | null;
    onDiffCurrent: (snapshot: VersionSnapshotType) => void;
    onStartCompare: (snapshot: VersionSnapshotType) => void;
    onDiffWithSelected: (snapshot: VersionSnapshotType) => void;
    onRestore: (snapshot: VersionSnapshotType) => void;
    onDelete: (snapshot: VersionSnapshotType) => void;
}

export function VersionsList(props: VersionsListProps) {
    return (
        <>
            {props.versions.map((snapshot) => (
                <VersionSnapshot
                    key={snapshot.id}
                    snapshot={snapshot}
                    isCompareSource={props.compareSourceId === snapshot.id}
                    isCompareTarget={props.compareSourceId !== null && props.compareSourceId !== snapshot.id}
                    onDiffCurrent={() => props.onDiffCurrent(snapshot)}
                    onStartCompare={() => props.onStartCompare(snapshot)}
                    onDiffWithSelected={() => props.onDiffWithSelected(snapshot)}
                    onRestore={() => props.onRestore(snapshot)}
                    onDelete={() => props.onDelete(snapshot)}
                />
            ))}
        </>
    );
}
