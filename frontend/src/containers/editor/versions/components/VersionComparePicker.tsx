import { useTranslation } from 'react-i18next';
import { ArrowRight, ArrowLeftRight, X, RotateCcw } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    DiffSideKind,
    isCurrent,
    type DiffSide,
} from '@/containers/editor/session/editorViewStore';
import { useVersionNavigation } from '../hooks/useVersionNavigation';
import type { SnapshotSummary } from '@/api/generated/types.gen';

interface VersionComparePickerProps {
    left: DiffSide;
    right: DiffSide;
    snapshots: SnapshotSummary[];
    onRestore?: () => void;
}

function sideLabel(side: DiffSide, snapshots: SnapshotSummary[], currentLabel: string): string {
    if (isCurrent(side)) return currentLabel;
    return snapshots.find((s) => s.id === side.id)?.label ?? side.id;
}

interface SidePickerProps {
    side: DiffSide;
    snapshots: SnapshotSummary[];
    currentLabel: string;
    onPick: (next: DiffSide) => void;
}

function SidePicker({ side, snapshots, currentLabel, onPick }: SidePickerProps) {
    const label = sideLabel(side, snapshots, currentLabel);
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button type="button" className="vh-picker-side">
                    <span className="vh-picker-label">{label}</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={4} className="vh-picker-menu">
                <DropdownMenuItem
                    onClick={() => onPick({ kind: DiffSideKind.Current })}
                    className={isCurrent(side) ? 'is-active' : ''}
                >
                    {currentLabel}
                </DropdownMenuItem>
                {snapshots.map((s) => {
                    const active = !isCurrent(side) && side.id === s.id;
                    return (
                        <DropdownMenuItem
                            key={s.id}
                            onClick={() => onPick({ kind: DiffSideKind.Snapshot, id: s.id })}
                            className={active ? 'is-active' : ''}
                        >
                            <span className="vh-picker-item-label">{s.label}</span>
                            <span className="vh-picker-item-meta">
                                {new Date(s.createdAt).toLocaleString()}
                            </span>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function VersionComparePicker({ left, right, snapshots, onRestore }: VersionComparePickerProps) {
    const { t } = useTranslation('editor');
    const nav = useVersionNavigation();
    const currentLabel = t('versionHistory.current');

    return (
        <div className="vh-picker">
            <div className="vh-picker-row">
                <span className="vh-picker-tag">{t('versionHistory.from')}</span>
                <SidePicker
                    side={left}
                    snapshots={snapshots}
                    currentLabel={currentLabel}
                    onPick={(next) => nav.setSide('left', next)}
                />
                <button
                    type="button"
                    className="vh-picker-swap"
                    onClick={() => nav.swap()}
                    title={t('versionHistory.swap')}
                    aria-label={t('versionHistory.swap')}
                >
                    <ArrowLeftRight size={14} />
                </button>
                <ArrowRight size={14} className="vh-picker-arrow" />
                <span className="vh-picker-tag">{t('versionHistory.to')}</span>
                <SidePicker
                    side={right}
                    snapshots={snapshots}
                    currentLabel={currentLabel}
                    onPick={(next) => nav.setSide('right', next)}
                />
            </div>
            <div className="vh-picker-actions">
                {onRestore && (
                    <button type="button" className="btn-primary" onClick={onRestore}>
                        <RotateCcw size={14} />
                        {t('versionHistory.restore')}
                    </button>
                )}
                <button
                    type="button"
                    className="vh-banner-close"
                    onClick={nav.close}
                    aria-label={t('versionHistory.close')}
                >
                    <X size={16} />
                    {t('versionHistory.close')}
                </button>
            </div>
        </div>
    );
}
