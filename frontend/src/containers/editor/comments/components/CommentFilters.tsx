import { useTranslation } from 'react-i18next';
import { shallow } from 'zustand/shallow';

import { Role, MENTIONABLE_ROLES } from '@/editor/identity/types';
import { roleI18nKey } from '@/lib/roleI18n';
import { useComments } from '../store/CommentsStoreProvider';
import { selectFilter, type Participant } from '../store/commentsSelectors';
import { CommentStatusFilter } from '../store/commentsStore';
import { AuthorChips } from './AuthorChips';

interface CommentFiltersProps {
    totalOpen: number;
    participants: Participant[];
}

export function CommentFilters({ totalOpen, participants }: CommentFiltersProps) {
    const { t } = useTranslation('editor');
    const filter = useComments(selectFilter, shallow);
    const setStatus = useComments((s) => s.setStatus);
    const setAuthorId = useComments((s) => s.setAuthorId);
    const setRole = useComments((s) => s.setRole);
    const statusLabels: Record<CommentStatusFilter, string> = {
        [CommentStatusFilter.Open]: `${t('comments.filter.open')} · ${totalOpen}`,
        [CommentStatusFilter.Resolved]: t('comments.filter.resolved'),
        [CommentStatusFilter.All]: t('comments.filter.all'),
        [CommentStatusFilter.Mine]: t('comments.filter.all'),
        [CommentStatusFilter.Orphan]: t('comments.orphanedTab'),
    };
    return (
        <div className="comment-filters">
            <div className="filter-chips">
                {[CommentStatusFilter.Open, CommentStatusFilter.Resolved, CommentStatusFilter.All, CommentStatusFilter.Orphan].map((s) => (
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
            <AuthorChips participants={participants} activeId={filter.authorId} onSelect={setAuthorId} />
            <select value={filter.role} onChange={(e) => setRole(e.target.value as Role | '')}>
                <option value="">{t('comments.filter.allRoles')}</option>
                {MENTIONABLE_ROLES.map((r) => (
                    <option key={r} value={r}>{t(roleI18nKey(r))}</option>
                ))}
            </select>
        </div>
    );
}
