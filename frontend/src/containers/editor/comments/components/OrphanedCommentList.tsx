import { useTranslation } from 'react-i18next';

import { OrphanThreadCard } from './OrphanThreadCard';

interface OrphanedCommentListProps {
    threadIds: string[];
    canDelete: boolean;
    pendingReattachId: string | null;
    canConfirmReattach: boolean;
    onDismiss: (id: string) => void;
    onReattach: (id: string) => void;
}

export function OrphanedCommentList({
    threadIds,
    pendingReattachId,
    canConfirmReattach,
    onDismiss,
    onReattach,
}: OrphanedCommentListProps) {
    const { t } = useTranslation('editor');

    return (
        <>
            <div className="sidebar-title sidebar-title-orphaned">
                {t('comments.orphanedCount', { count: threadIds.length })}
            </div>
            {threadIds.map((id) => (
                <OrphanThreadCard
                    key={id}
                    threadId={id}
                    isReattaching={pendingReattachId === id}
                    canConfirmReattach={canConfirmReattach}
                    onDismiss={() => onDismiss(id)}
                    onReattach={() => onReattach(id)}
                />
            ))}
        </>
    );
}
