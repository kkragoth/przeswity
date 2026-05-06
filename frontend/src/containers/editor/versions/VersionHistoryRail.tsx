import { useTranslation } from 'react-i18next';
import { useVersionNavigation } from './hooks/useVersionNavigation';
import {
    DiffSideKind,
    isCurrent,
    type DiffSide,
} from '@/containers/editor/session/editorViewStore';
import type { SnapshotSummary } from '@/api/generated/types.gen';
import { RowRole, SnapshotList } from './components/SnapshotList';

interface VersionHistoryRailProps {
    snapshots: SnapshotSummary[];
    left: DiffSide;
    right: DiffSide;
}

function combineRoles(isFrom: boolean, isTo: boolean): RowRole {
    if (isFrom && isTo) return RowRole.Both;
    if (isFrom) return RowRole.From;
    if (isTo) return RowRole.To;
    return RowRole.None;
}

const isSnapshotMatch = (id: string) => (side: DiffSide) =>
    !isCurrent(side) && side.id === id;

export function VersionHistoryRail({ snapshots, left, right }: VersionHistoryRailProps) {
    const { t } = useTranslation('editor');
    const nav = useVersionNavigation();

    const setRight = (side: DiffSide) => nav.setSide('right', side);
    const setLeft = (side: DiffSide) => nav.setSide('left', side);

    const currentRole = combineRoles(isCurrent(left), isCurrent(right));

    const legend = (
        <div className="vh-rail-legend">
            <span className="vh-rail-legend-item"><span className="vh-rail-dot is-from" />{t('versionHistory.from')}</span>
            <span className="vh-rail-legend-item"><span className="vh-rail-dot is-to" />{t('versionHistory.to')}</span>
            <span className="vh-rail-legend-hint">{t('versionHistory.legendHint')}</span>
        </div>
    );

    return (
        <SnapshotList
            snapshots={snapshots}
            currentRole={currentRole}
            onCurrentClick={() => setRight({ kind: DiffSideKind.Current })}
            onCurrentContextMenu={() => setLeft({ kind: DiffSideKind.Current })}
            onRowClick={(snap) => setRight({ kind: DiffSideKind.Snapshot, id: snap.id })}
            onRowContextMenu={(snap) => setLeft({ kind: DiffSideKind.Snapshot, id: snap.id })}
            roleFor={(snap) =>
                combineRoles(isSnapshotMatch(snap.id)(left), isSnapshotMatch(snap.id)(right))
            }
            legend={legend}
            rowTitle={t('versionHistory.rowTitle')}
        />
    );
}
