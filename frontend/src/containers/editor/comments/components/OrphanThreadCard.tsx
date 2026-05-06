import { useTranslation } from 'react-i18next';

import { Avatar } from '@/editor/shell/Avatar';
import { authorColor } from '@/editor/comments/authorColor';
import { renderBodyWithMentions } from './MentionTextarea';
import { useThread } from '../hooks/useThread';
import { useCommentsView } from './CommentsViewContext';

interface OrphanThreadCardProps {
    threadId: string;
    onDismiss: () => void;
    onReattach: () => void;
    isReattaching: boolean;
    canConfirmReattach: boolean;
}

export function OrphanThreadCard({
    threadId,
    onDismiss,
    onReattach,
    isReattaching,
    canConfirmReattach,
}: OrphanThreadCardProps) {
    const { t } = useTranslation('editor');
    const { formatRelative } = useCommentsView();
    const thread = useThread(threadId);

    if (!thread || !thread.orphan) return null;

    const timeLabel = formatRelative(thread.orphan.orphanedAt);
    const isConfirmMode = isReattaching && canConfirmReattach;

    return (
        <div className="thread is-orphan" data-thread-id={threadId}>
            <div className="thread-head">
                <Avatar name={thread.authorName} color={authorColor(thread)} size="sm" />
                <div className="thread-head-text">
                    <div className="thread-head-row">
                        <span className="thread-author">{thread.authorName}</span>
                        <span className="thread-head-meta">
                            <span className="thread-head-role">{thread.authorRole}</span>
                            <span className="thread-head-dot">·</span>
                            <span className="thread-head-time">{timeLabel}</span>
                        </span>
                    </div>
                </div>
            </div>
            <div className="thread-quote-label">{t('comments.orphanedQuoteLabel')}</div>
            <div className="thread-quote thread-quote-orphan">
                "{thread.orphan.lastKnownQuote}"
            </div>
            {thread.body ? (
                <div className="thread-body">{renderBodyWithMentions(thread.body)}</div>
            ) : null}
            <div className="thread-actions">
                {isReattaching ? (
                    <button
                        type="button"
                        className={isConfirmMode ? 'btn-primary' : ''}
                        disabled={!isConfirmMode}
                        onClick={isConfirmMode ? onReattach : undefined}
                    >
                        {isConfirmMode
                            ? t('comments.confirmReattach')
                            : t('comments.reattachWaiting')}
                    </button>
                ) : (
                    <button type="button" onClick={onReattach}>
                        {t('comments.reattach')}
                    </button>
                )}
                <button type="button" onClick={onDismiss}>
                    {t('comments.dismissOrphan')}
                </button>
            </div>
        </div>
    );
}
