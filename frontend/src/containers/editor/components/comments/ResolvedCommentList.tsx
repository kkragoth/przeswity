import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '@/lib/dates';
import type { CommentThread } from '@/editor/comments/types';
import { ResolvedThreadCard } from '@/containers/editor/components/comments/ResolvedThreadCard';

interface ResolvedCommentListProps {
    threads: CommentThread[];
    canDelete: boolean;
    onReopen: (id: string) => void;
    onDelete: (id: string) => void;
}

export function ResolvedCommentList({ threads, canDelete, onReopen, onDelete }: ResolvedCommentListProps) {
    const { i18n, t } = useTranslation('editor');

    return (
        <>
            <div className="sidebar-title sidebar-title-resolved">
                {t('comments.filter.resolved')} ({threads.length})
            </div>
            {threads.map((thread) => (
                <ResolvedThreadCard
                    key={thread.id}
                    thread={thread}
                    timeLabel={thread.resolvedAt ? formatRelativeTime(thread.resolvedAt, i18n.language, t) : ''}
                    canDelete={canDelete}
                    onReopen={() => onReopen(thread.id)}
                    onDelete={() => onDelete(thread.id)}
                />
            ))}
        </>
    );
}
