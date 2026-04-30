import { useTranslation } from 'react-i18next';
import { Avatar } from '@/editor/shell/Avatar';
import { authorColor } from '@/editor/comments/color';
import type { CommentThread } from '@/editor/comments/types';
import { renderBodyWithMentions } from '@/containers/editor/components/comments/MentionTextarea';

interface ResolvedThreadCardProps {
    thread: CommentThread;
    timeLabel: string;
    canDelete: boolean;
    onReopen: () => void;
    onDelete: () => void;
}

export function ResolvedThreadCard({ thread, timeLabel, canDelete, onReopen, onDelete }: ResolvedThreadCardProps) {
    const { t } = useTranslation('editor');
    return (
        <div className="thread is-resolved">
            <div className="thread-head">
                <Avatar name={thread.authorName} color={authorColor(thread)} size="md" />
                <div className="thread-head-text">
                    <div className="thread-head-row">
                        <span className="thread-author">{thread.authorName}</span>
                        <span className="thread-role-chip">{thread.authorRole}</span>
                    </div>
                    <div className="thread-head-time">
                        {t('comments.resolvedBy', { name: thread.resolvedBy ?? '' })}
                        {thread.resolvedAt ? ` · ${timeLabel}` : ''}
                    </div>
                </div>
            </div>
            <div className="thread-quote">"{thread.originalQuote}"</div>
            {thread.body ? <div className="thread-body">{renderBodyWithMentions(thread.body)}</div> : null}
            <div className="thread-actions">
                <button type="button" onClick={onReopen}>{t('comments.reopen')}</button>
                {canDelete ? (
                    <button
                        type="button"
                        className="thread-icon-btn thread-remove"
                        onClick={() => {
                            if (window.confirm(t('comments.deleteResolvedConfirm'))) onDelete();
                        }}
                    >🗑</button>
                ) : null}
            </div>
        </div>
    );
}
