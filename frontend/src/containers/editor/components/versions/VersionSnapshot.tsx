import type { VersionSnapshot as VersionSnapshotType } from '@/editor/versions/types';

interface VersionSnapshotProps {
    snapshot: VersionSnapshotType;
    isCompareSource: boolean;
    isCompareTarget: boolean;
    onDiffCurrent: () => void;
    onStartCompare: () => void;
    onDiffWithSelected: () => void;
    onRestore: () => void;
    onDelete: () => void;
}

export function VersionSnapshot(props: VersionSnapshotProps) {
    const s = props.snapshot;
    return (
        <div
            className={`version${props.isCompareSource ? ' is-compare-src' : ''}${props.isCompareTarget ? ' is-compare-target' : ''}${s.auto ? ' is-auto' : ''}`}
        >
            <div className="version-label">
                {s.auto ? <span className="auto-badge">auto</span> : null}
                {s.label}
            </div>
            <div className="version-meta">
                {s.authorName} · {new Date(s.createdAt).toLocaleString()}
            </div>
            <div className="version-actions">
                {props.isCompareTarget ? (
                    <button type="button" onClick={props.onDiffWithSelected}>Diff with selected</button>
                ) : (
                    <>
                        <button type="button" onClick={props.onDiffCurrent}>Diff vs current</button>
                        <button type="button" onClick={props.onStartCompare}>Compare ↔</button>
                        <button type="button" onClick={props.onRestore}>Restore</button>
                        <button type="button" className="btn-danger" onClick={props.onDelete}>Delete</button>
                    </>
                )}
            </div>
        </div>
    );
}
