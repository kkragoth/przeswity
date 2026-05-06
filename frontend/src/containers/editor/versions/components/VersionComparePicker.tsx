import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowLeftRight, X, RotateCcw } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    DiffSideKind,
    isCurrent,
    type DiffSide,
} from '@/containers/editor/session/editorViewStore';
import { useVersionNavigation } from '../hooks/useVersionNavigation';
import type { SnapshotSummary } from '@/api/generated/types.gen';
import { friendlySideLabel } from '../utils/sideLabel';
import { isAutoSnapshot } from '../utils/snapshotKind';
import { dayBucket, dayBucketLabel, shortTime } from '../utils/friendlyTime';
import { useTimeLabels } from '../utils/useTimeLabels';

interface VersionComparePickerProps {
    left: DiffSide;
    right: DiffSide;
    snapshots: SnapshotSummary[];
    onRestore?: () => void;
    children?: React.ReactNode;
}

interface SidePickerProps {
    side: DiffSide;
    snapshots: SnapshotSummary[];
    currentLabel: string;
    onPick: (next: DiffSide) => void;
    role: 'from' | 'to';
}

function SidePicker({ side, snapshots, currentLabel, onPick, role }: SidePickerProps) {
    const { t } = useTranslation('editor');
    const timeLabels = useTimeLabels();
    const label = friendlySideLabel(side, snapshots, currentLabel, timeLabels);

    const groups: { key: string; label: string; items: SnapshotSummary[] }[] = [];
    const groupMap = new Map<string, { key: string; label: string; items: SnapshotSummary[] }>();
    for (const snap of snapshots) {
        const bucket = dayBucket(snap.createdAt);
        let group = groupMap.get(bucket.key);
        if (!group) {
            group = { key: bucket.key, label: dayBucketLabel(bucket, timeLabels), items: [] };
            groupMap.set(bucket.key, group);
            groups.push(group);
        }
        group.items.push(snap);
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button type="button" className={`vh-picker-side is-${role}`}>
                    <span className="vh-picker-dot" aria-hidden />
                    <span className="vh-picker-label">{label}</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={4} className="vh-picker-menu">
                <DropdownMenuItem
                    onClick={() => onPick({ kind: DiffSideKind.Current })}
                    className={isCurrent(side) ? 'is-active' : ''}
                >
                    <span className="vh-picker-item-label">{currentLabel}</span>
                </DropdownMenuItem>
                {groups.map((group, gi) => (
                    <div key={group.key}>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="vh-picker-group">{group.label}</DropdownMenuLabel>
                        {group.items.map((s) => {
                            const active = !isCurrent(side) && side.id === s.id;
                            const auto = isAutoSnapshot(s);
                            const itemLabel = auto ? t('versionHistory.autoLabel') : s.label;
                            return (
                                <DropdownMenuItem
                                    key={s.id}
                                    onClick={() => onPick({ kind: DiffSideKind.Snapshot, id: s.id })}
                                    className={active ? 'is-active' : ''}
                                >
                                    <span className="vh-picker-item-time">{shortTime(s.createdAt)}</span>
                                    <span className={`vh-picker-item-label${auto ? ' is-auto' : ''}`}>{itemLabel}</span>
                                    <span className="vh-picker-item-meta">{s.createdBy.name}</span>
                                </DropdownMenuItem>
                            );
                        })}
                        {gi === groups.length - 1 && null}
                    </div>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function VersionComparePicker({ left, right, snapshots, onRestore, children }: VersionComparePickerProps) {
    const { t } = useTranslation('editor');
    const nav = useVersionNavigation();
    const currentLabel = t('versionHistory.current');

    return (
        <div className="vh-toolbar">
            <div className="vh-toolbar-pickers">
                <button
                    type="button"
                    className="vh-picker-swap"
                    onClick={() => nav.swap()}
                    title={t('versionHistory.swap')}
                    aria-label={t('versionHistory.swap')}
                >
                    <ArrowLeftRight size={14} />
                </button>
                <SidePicker
                    side={right}
                    snapshots={snapshots}
                    currentLabel={currentLabel}
                    onPick={(next) => nav.setSide('right', next)}
                    role="to"
                />
                <ArrowLeft size={14} className="vh-picker-arrow" />
                <SidePicker
                    side={left}
                    snapshots={snapshots}
                    currentLabel={currentLabel}
                    onPick={(next) => nav.setSide('left', next)}
                    role="from"
                />
            </div>
            {children && <div className="vh-toolbar-mid">{children}</div>}
            <div className="vh-toolbar-actions">
                {onRestore && (
                    <button type="button" className="vh-toolbar-restore" onClick={onRestore}>
                        <RotateCcw size={14} />
                        {t('versionHistory.restore')}
                    </button>
                )}
                <button
                    type="button"
                    className="vh-toolbar-close"
                    onClick={nav.close}
                    aria-label={t('versionHistory.close')}
                    title={t('versionHistory.close')}
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
