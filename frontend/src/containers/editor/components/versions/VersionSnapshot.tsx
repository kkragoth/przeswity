import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation('editor');
    const s = props.snapshot;
    return (
        <div
            className={`version${props.isCompareSource ? ' is-compare-src' : ''}${props.isCompareTarget ? ' is-compare-target' : ''}${s.auto ? ' is-auto' : ''}`}
        >
            <div className="version-label">
                {s.auto ? <span className="auto-badge">{t('versions.autoBadge')}</span> : null}
                {s.label}
            </div>
            <div className="version-meta">
                {s.authorName} · {new Date(s.createdAt).toLocaleString()}
            </div>
            <div className="version-actions">
                {props.isCompareTarget ? (
                    <button type="button" onClick={props.onDiffWithSelected}>{t('versions.diffWithSelected')}</button>
                ) : (
                    <>
                        <button type="button" onClick={props.onDiffCurrent}>{t('versions.diffVsCurrent')}</button>
                        <button type="button" onClick={props.onStartCompare}>{t('versions.compareWith')}</button>
                        <button type="button" onClick={props.onRestore}>{t('versions.restore')}</button>
                        <button type="button" className="btn-danger" onClick={props.onDelete}>{t('versions.delete')}</button>
                    </>
                )}
            </div>
        </div>
    );
}
