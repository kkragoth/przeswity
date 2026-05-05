import { useTranslation } from 'react-i18next';
import { useVersionNavigation } from './hooks/useVersionNavigation';
import {
    DiffSideKind,
    isCurrent,
    type DiffSide,
} from '@/containers/editor/session/editorViewStore';
import type { SnapshotSummary } from '@/api/generated/types.gen';

interface VersionHistoryRailProps {
    snapshots: SnapshotSummary[];
    left: DiffSide;
    right: DiffSide;
}

const matches = (side: DiffSide, snapshotId: string) =>
    !isCurrent(side) && side.id === snapshotId;

export function VersionHistoryRail({ snapshots, left, right }: VersionHistoryRailProps) {
    const { t } = useTranslation('editor');
    const nav = useVersionNavigation();

    const setRightToSnapshot = (id: string) => {
        nav.setSide('right', { kind: DiffSideKind.Snapshot, id });
    };
    const setRightToCurrent = () => {
        nav.setSide('right', { kind: DiffSideKind.Current });
    };

    const renderItem = (key: string, label: string, meta: string | null, isLeft: boolean, isRight: boolean, onClick: () => void) => {
        const cls = [
            'vh-rail-item',
            isRight ? 'is-active' : '',
            isLeft ? 'is-compare' : '',
        ].filter(Boolean).join(' ');
        return (
            <button key={key} type="button" className={cls} onClick={onClick}>
                <div className="vh-rail-label">{label}</div>
                {meta && <div className="vh-rail-meta">{meta}</div>}
                <div className="vh-rail-badges">
                    {isLeft && <span className="vh-rail-side-badge is-left">{t('versionHistory.fromBadge')}</span>}
                    {isRight && <span className="vh-rail-side-badge is-right">{t('versionHistory.toBadge')}</span>}
                </div>
            </button>
        );
    };

    return (
        <aside className="vh-rail">
            <div className="vh-rail-header">{t('versionHistory.title')}</div>
            <div className="vh-rail-hint">{t('versionHistory.railHint')}</div>
            <div className="vh-rail-list">
                {renderItem(
                    'current',
                    t('versionHistory.current'),
                    null,
                    isCurrent(left),
                    isCurrent(right),
                    setRightToCurrent,
                )}
                {snapshots.length === 0 && (
                    <div className="sidebar-empty">{t('versions.empty')}</div>
                )}
                {snapshots.map((snap) =>
                    renderItem(
                        snap.id,
                        snap.label,
                        `${snap.createdBy.name} · ${new Date(snap.createdAt).toLocaleString()}`,
                        matches(left, snap.id),
                        matches(right, snap.id),
                        () => setRightToSnapshot(snap.id),
                    ),
                )}
            </div>
        </aside>
    );
}
