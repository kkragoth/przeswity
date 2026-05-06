import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Sparkles } from 'lucide-react';
import type { SnapshotSummary } from '@/api/generated/types.gen';
import { isAutoSnapshot, snapshotKind, SnapshotKind } from '../utils/snapshotKind';
import { dayBucket, dayBucketLabel, shortTime, type TimeLabels } from '../utils/friendlyTime';
import { useTimeLabels } from '../utils/useTimeLabels';

export enum RowRole {
    None = 'none',
    From = 'from',
    To = 'to',
    Both = 'both',
}

interface Group {
    key: string;
    label: string;
    items: SnapshotSummary[];
}

function matchesQuery(snap: SnapshotSummary, q: string): boolean {
    if (!q) return true;
    const needle = q.toLowerCase();
    if (snap.createdBy.name.toLowerCase().includes(needle)) return true;
    if (snapshotKind(snap) === SnapshotKind.Manual && snap.label.toLowerCase().includes(needle)) return true;
    return false;
}

function groupSnapshots(snapshots: SnapshotSummary[], labels: TimeLabels): Group[] {
    const map = new Map<string, Group>();
    for (const snap of snapshots) {
        const bucket = dayBucket(snap.createdAt);
        const existing = map.get(bucket.key);
        if (existing) {
            existing.items.push(snap);
        } else {
            map.set(bucket.key, {
                key: bucket.key,
                label: dayBucketLabel(bucket, labels),
                items: [snap],
            });
        }
    }
    return Array.from(map.values());
}

const SHOW_AUTO_KEY = 'versionShowAuto';

function loadShowAuto(): boolean {
    try {
        return localStorage.getItem(SHOW_AUTO_KEY) !== 'false';
    } catch {
        return true;
    }
}

function saveShowAuto(value: boolean): void {
    try {
        localStorage.setItem(SHOW_AUTO_KEY, String(value));
    } catch { /* ignore */ }
}

interface RowProps {
    role: RowRole;
    onClick: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    children: ReactNode;
    actions?: ReactNode;
    title?: string;
}

function Row({ role, onClick, onContextMenu, children, actions, title }: RowProps) {
    return (
        <div
            className={`vh-rail-row is-${role}`}
            onClick={onClick}
            onContextMenu={(e) => {
                if (onContextMenu) {
                    e.preventDefault();
                    onContextMenu(e);
                }
            }}
            role="button"
            tabIndex={0}
            title={title}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            <span className="vh-rail-bar" aria-hidden />
            <span className="vh-rail-row-body">{children}</span>
            {actions && <span className="vh-rail-row-actions">{actions}</span>}
        </div>
    );
}

interface SnapshotRowProps {
    snap: SnapshotSummary;
    role: RowRole;
    showAuthor: boolean;
    onClick: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    actions?: ReactNode;
    autoLabel: string;
    rowTitle?: string;
}

function SnapshotRow({ snap, role, showAuthor, onClick, onContextMenu, actions, autoLabel, rowTitle }: SnapshotRowProps) {
    const auto = isAutoSnapshot(snap);
    return (
        <Row role={role} onClick={onClick} onContextMenu={onContextMenu} actions={actions} title={rowTitle}>
            <span className={`vh-rail-row-time${auto ? ' is-auto' : ''}`}>{shortTime(snap.createdAt)}</span>
            <span className="vh-rail-row-main">
                <span className={`vh-rail-row-label${auto ? ' is-auto' : ''}`}>
                    {auto ? autoLabel : snap.label}
                </span>
                {showAuthor && (
                    <span className="vh-rail-row-author" style={{ color: snap.createdBy.color }}>
                        {snap.createdBy.name}
                    </span>
                )}
            </span>
        </Row>
    );
}

export interface SnapshotListProps {
    snapshots: SnapshotSummary[];
    /** When provided, renders a "Current" row above the list. */
    currentRole?: RowRole;
    onCurrentClick?: () => void;
    onCurrentContextMenu?: (e: React.MouseEvent) => void;
    /** Per-row main click. */
    onRowClick: (snap: SnapshotSummary) => void;
    /** Per-row alt action (right-click). */
    onRowContextMenu?: (snap: SnapshotSummary, e: React.MouseEvent) => void;
    /** Optional role per row (e.g. FROM/TO bar in compare view). */
    roleFor?: (snap: SnapshotSummary) => RowRole;
    /** Optional inline actions rendered at the end of each row (e.g. kebab menu). */
    rowActions?: (snap: SnapshotSummary) => ReactNode;
    /** Legend / hint shown beneath the search. */
    legend?: ReactNode;
    /** Optional class on the container. */
    className?: string;
    rowTitle?: string;
}

export function SnapshotList({
    snapshots,
    currentRole,
    onCurrentClick,
    onCurrentContextMenu,
    onRowClick,
    onRowContextMenu,
    roleFor,
    rowActions,
    legend,
    className,
    rowTitle,
}: SnapshotListProps) {
    const { t } = useTranslation('editor');
    const timeLabels = useTimeLabels();
    const [query, setQuery] = useState('');
    const [showAuto, setShowAuto] = useState<boolean>(() => loadShowAuto());

    const toggleShowAuto = () => {
        setShowAuto((prev) => {
            const next = !prev;
            saveShowAuto(next);
            return next;
        });
    };

    const autoCount = useMemo(() => snapshots.filter(isAutoSnapshot).length, [snapshots]);
    const filtered = useMemo(
        () => snapshots.filter((s) => {
            if (!showAuto && isAutoSnapshot(s)) return false;
            return matchesQuery(s, query);
        }),
        [snapshots, query, showAuto],
    );
    const groups = useMemo(() => groupSnapshots(filtered, timeLabels), [filtered, timeLabels]);
    const autoLabel = t('versionHistory.autoLabel');

    return (
        <div className={`vh-rail${className ? ` ${className}` : ''}`}>
            <div className="vh-rail-search">
                <Search size={12} className="vh-rail-search-icon" aria-hidden />
                <input
                    type="text"
                    className="vh-rail-search-input"
                    placeholder={t('versionHistory.searchPlaceholder')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                    <button
                        type="button"
                        className="vh-rail-search-clear"
                        onClick={() => setQuery('')}
                        aria-label={t('versionHistory.clearSearch')}
                    >
                        <X size={12} />
                    </button>
                )}
            </div>

            {autoCount > 0 && (
                <button
                    type="button"
                    className={`vh-rail-auto-toggle${showAuto ? ' is-on' : ''}`}
                    onClick={toggleShowAuto}
                    aria-pressed={showAuto}
                    title={showAuto ? t('versionHistory.hideAuto') : t('versionHistory.showAuto')}
                >
                    <Sparkles size={12} />
                    <span className="vh-rail-auto-toggle-label">
                        {showAuto ? t('versionHistory.hideAuto') : t('versionHistory.showAuto')}
                    </span>
                    <span className="vh-rail-auto-toggle-count">{autoCount}</span>
                </button>
            )}

            {legend}

            <div className="vh-rail-list">
                {currentRole !== undefined && onCurrentClick && (
                    <Row
                        role={currentRole}
                        onClick={onCurrentClick}
                        onContextMenu={onCurrentContextMenu}
                        title={rowTitle}
                    >
                        <span className="vh-rail-row-label is-current">{t('versionHistory.current')}</span>
                    </Row>
                )}

                {filtered.length === 0 && snapshots.length > 0 && (
                    <div className="sidebar-empty">{t('versionHistory.noMatches')}</div>
                )}
                {snapshots.length === 0 && (
                    <div className="sidebar-empty">{t('versions.empty')}</div>
                )}

                {groups.map((group) => (
                    <div key={group.key} className="vh-rail-group">
                        <div className="vh-rail-group-header">{group.label}</div>
                        {group.items.map((snap, idx) => {
                            const prev = group.items[idx - 1];
                            const sameAuthor = !!prev && prev.createdBy.id === snap.createdBy.id;
                            const role = roleFor ? roleFor(snap) : RowRole.None;
                            return (
                                <SnapshotRow
                                    key={snap.id}
                                    snap={snap}
                                    role={role}
                                    showAuthor={!sameAuthor}
                                    onClick={() => onRowClick(snap)}
                                    onContextMenu={
                                        onRowContextMenu ? (e) => onRowContextMenu(snap, e) : undefined
                                    }
                                    actions={rowActions ? rowActions(snap) : undefined}
                                    autoLabel={autoLabel}
                                    rowTitle={rowTitle}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
