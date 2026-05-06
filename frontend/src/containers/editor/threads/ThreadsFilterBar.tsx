import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ArrowDownUp, Check } from 'lucide-react';
import {
    ThreadStatusFilter,
    ThreadTypeFilter,
    ThreadSort,
} from './types';
import type { ThreadCounts } from './useUnifiedThreads';

interface ThreadsFilterBarProps {
    status: ThreadStatusFilter;
    type: ThreadTypeFilter;
    onlyMine: boolean;
    sort: ThreadSort;
    counts: ThreadCounts;
    onStatusChange: (s: ThreadStatusFilter) => void;
    onTypeChange: (t: ThreadTypeFilter) => void;
    onMineChange: (mine: boolean) => void;
    onSortChange: (s: ThreadSort) => void;
}

interface ChipProps {
    active: boolean;
    onClick: () => void;
    label: string;
    count?: number;
    title?: string;
}

const Chip = memo(function Chip({ active, onClick, label, count, title }: ChipProps) {
    return (
        <button
            type="button"
            className={`threads-filter-chip${active ? ' is-active' : ''}`}
            onClick={onClick}
            title={title}
            aria-pressed={active}
        >
            <span>{label}</span>
            {count !== undefined && (
                <span className="threads-filter-chip-count">{count}</span>
            )}
        </button>
    );
});

const SORT_OPTIONS: ThreadSort[] = [ThreadSort.Position, ThreadSort.Newest, ThreadSort.Oldest];

export function ThreadsFilterBar(props: ThreadsFilterBarProps) {
    const {
        status, type, onlyMine, sort, counts,
        onStatusChange, onTypeChange, onMineChange, onSortChange,
    } = props;
    const { t } = useTranslation('editor');

    const sortLabel = (s: ThreadSort) => {
        if (s === ThreadSort.Newest) return t('threads.sort.newest');
        if (s === ThreadSort.Oldest) return t('threads.sort.oldest');
        return t('threads.sort.position');
    };

    return (
        <div className="threads-filter-bar">
            <div className="threads-filter-group" role="group" aria-label={t('threads.filterGroup.status')}>
                <Chip
                    active={status === ThreadStatusFilter.All}
                    onClick={() => onStatusChange(ThreadStatusFilter.All)}
                    label={t('threads.filter.all')}
                    count={counts.total}
                />
                <Chip
                    active={status === ThreadStatusFilter.Open}
                    onClick={() => onStatusChange(ThreadStatusFilter.Open)}
                    label={t('threads.filter.open')}
                    count={counts.open}
                />
                <Chip
                    active={status === ThreadStatusFilter.Resolved}
                    onClick={() => onStatusChange(ThreadStatusFilter.Resolved)}
                    label={t('threads.filter.resolved')}
                    count={counts.resolved}
                />
            </div>

            <div className="threads-filter-divider" aria-hidden />

            <div className="threads-filter-group" role="group" aria-label={t('threads.filterGroup.type')}>
                <Chip
                    active={type === ThreadTypeFilter.Comments}
                    onClick={() => onTypeChange(type === ThreadTypeFilter.Comments ? ThreadTypeFilter.All : ThreadTypeFilter.Comments)}
                    label={t('threads.filter.comments')}
                    count={counts.comments}
                />
                <Chip
                    active={type === ThreadTypeFilter.Suggestions}
                    onClick={() => onTypeChange(type === ThreadTypeFilter.Suggestions ? ThreadTypeFilter.All : ThreadTypeFilter.Suggestions)}
                    label={t('threads.filter.suggestions')}
                    count={counts.suggestions}
                />
                <Chip
                    active={onlyMine}
                    onClick={() => onMineChange(!onlyMine)}
                    label={t('threads.filter.mine')}
                    count={counts.mine}
                />
            </div>

            <div className="threads-filter-spacer" />

            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button
                        type="button"
                        className="threads-sort-btn"
                        title={t('threads.sort.label')}
                        aria-label={t('threads.sort.label')}
                    >
                        <ArrowDownUp size={12} />
                        <span>{sortLabel(sort)}</span>
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content align="end" sideOffset={4} className="topbar-dropdown-content">
                        {SORT_OPTIONS.map((opt) => (
                            <DropdownMenu.Item
                                key={opt}
                                className="topbar-dropdown-item"
                                onSelect={() => onSortChange(opt)}
                            >
                                <span className="topbar-dropdown-check">
                                    {sort === opt ? <Check size={13} /> : null}
                                </span>
                                {sortLabel(opt)}
                            </DropdownMenu.Item>
                        ))}
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>
        </div>
    );
}
