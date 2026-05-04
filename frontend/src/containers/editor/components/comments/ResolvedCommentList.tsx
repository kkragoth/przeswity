import { useTranslation } from 'react-i18next';

import { ResolvedThreadCard } from '@/containers/editor/components/comments/ResolvedThreadCard';

interface ResolvedCommentListProps {
    threadIds: string[];
    canDelete: boolean;
    onReopen: (id: string) => void;
    onDelete: (id: string) => void;
}

export function ResolvedCommentList({ threadIds, canDelete, onReopen, onDelete }: ResolvedCommentListProps) {
    const { t } = useTranslation('editor');

    return (
        <>
            <div className="sidebar-title sidebar-title-resolved">
                {t('comments.filter.resolved')} ({threadIds.length})
            </div>
            {threadIds.map((id) => (
                <ResolvedThreadCard
                    key={id}
                    threadId={id}
                    canDelete={canDelete}
                    onReopen={() => onReopen(id)}
                    onDelete={() => onDelete(id)}
                />
            ))}
        </>
    );
}
