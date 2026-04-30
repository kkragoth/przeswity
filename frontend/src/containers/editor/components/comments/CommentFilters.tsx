import { useTranslation } from 'react-i18next';
import type { Role } from '@/editor/identity/types';
import { roleI18nKey } from '@/lib/roleI18n';
import { CommentStatusFilter, type CommentFilterState } from '@/containers/editor/hooks/useCommentThreads';

const ROLES: Role[] = ['translator', 'author', 'editor', 'proofreader', 'coordinator'];

interface CommentFiltersProps {
    filter: CommentFilterState;
    setStatus: (next: CommentStatusFilter) => void;
    setAuthor: (next: string) => void;
    setRole: (next: Role | '') => void;
    totalOpen: number;
    allAuthors: string[];
}

export function CommentFilters({ filter, setStatus, setAuthor, setRole, totalOpen, allAuthors }: CommentFiltersProps) {
    const { t } = useTranslation('editor');
    const statusLabels: Record<CommentStatusFilter, string> = {
        [CommentStatusFilter.Open]: `${t('comments.filter.open')} · ${totalOpen}`,
        [CommentStatusFilter.Resolved]: t('comments.filter.resolved'),
        [CommentStatusFilter.All]: t('comments.filter.all'),
        [CommentStatusFilter.Mine]: t('comments.filter.all'),
    };
    return (
        <div className="comment-filters">
            <div className="filter-chips">
                {[CommentStatusFilter.Open, CommentStatusFilter.Resolved, CommentStatusFilter.All].map((s) => (
                    <button
                        key={s}
                        type="button"
                        aria-pressed={filter.status === s}
                        className={`filter-chip${filter.status === s ? ' is-active' : ''}`}
                        onClick={() => setStatus(s)}
                    >
                        {statusLabels[s]}
                    </button>
                ))}
            </div>
            <select value={filter.author} onChange={(e) => setAuthor(e.target.value)}>
                <option value="">{t('comments.filter.allAuthors')}</option>
                {allAuthors.map((a) => (
                    <option key={a} value={a}>{a}</option>
                ))}
            </select>
            <select value={filter.role} onChange={(e) => setRole(e.target.value as Role | '')}>
                <option value="">{t('comments.filter.allRoles')}</option>
                {ROLES.map((r) => (
                    <option key={r} value={r}>{t(roleI18nKey(r))}</option>
                ))}
            </select>
        </div>
    );
}
