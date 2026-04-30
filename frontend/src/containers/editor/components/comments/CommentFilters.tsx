import { useTranslation } from 'react-i18next';
import { CommentStatusFilter } from '@/containers/editor/hooks/useCommentThreads';

export function CommentFilters({
    filter,
    setFilter,
    totalOpen,
}: {
    filter: CommentStatusFilter;
    setFilter: (next: CommentStatusFilter) => void;
    totalOpen: number;
}) {
    const { t } = useTranslation('editor');
    const labels: Record<CommentStatusFilter, string> = {
        [CommentStatusFilter.Open]: `${t('comments.filter.open')} · ${totalOpen}`,
        [CommentStatusFilter.Resolved]: t('comments.filter.resolved'),
        [CommentStatusFilter.All]: t('comments.filter.all'),
        [CommentStatusFilter.Mine]: t('comments.filter.all'),
    };
    return (
        <div className="filter-chips">
            {[CommentStatusFilter.Open, CommentStatusFilter.Resolved, CommentStatusFilter.All].map((v) => (
                <button
                    key={v}
                    type="button"
                    aria-pressed={filter === v}
                    className={`filter-chip${filter === v ? ' is-active' : ''}`}
                    onClick={() => setFilter(v)}
                >
                    {labels[v]}
                </button>
            ))}
        </div>
    );
}
