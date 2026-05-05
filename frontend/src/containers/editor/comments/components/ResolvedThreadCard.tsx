import { useTranslation } from 'react-i18next';

import { Avatar } from '@/editor/shell/Avatar';
import { authorColor } from '@/editor/comments/authorColor';
import { renderBodyWithMentions } from './MentionTextarea';
import { useConfirmDialog } from '@/components/feedback/useConfirmDialog';
import { ConfirmDialogHost } from '@/components/feedback/ConfirmDialogHost';
import { useThread } from '../hooks/useThread';
import { useCommentsView } from './CommentsViewContext';

interface ResolvedThreadCardProps {
    threadId: string;
    canDelete: boolean;
    onReopen: () => void;
    onDelete: () => void;
}

export function ResolvedThreadCard({ threadId, canDelete, onReopen, onDelete }: ResolvedThreadCardProps) {
    const { t } = useTranslation('editor');
    const confirmDlg = useConfirmDialog();
    const { formatRelative } = useCommentsView();
    const thread = useThread(threadId);

    const handleDelete = async () => {
        const ok = await confirmDlg.confirm({ title: t('comments.deleteResolvedConfirm'), destructive: true });
        if (ok) onDelete();
    };

    if (!thread) return null;
    const timeLabel = thread.resolvedAt ? formatRelative(thread.resolvedAt) : '';

    return (
        <div className="thread is-resolved">
            <div className="thread-head">
                <Avatar name={thread.authorName} color={authorColor(thread)} size="sm" />
                <div className="thread-head-text">
                    <div className="thread-head-row">
                        <span className="thread-author">{thread.authorName}</span>
                        <span className="thread-head-meta">
                            <span className="thread-head-role">{thread.authorRole}</span>
                            <span className="thread-head-dot">·</span>
                            <span className="thread-head-time">
                                {t('comments.resolvedBy', { name: thread.resolvedBy ?? '' })}
                                {thread.resolvedAt ? ` · ${timeLabel}` : ''}
                            </span>
                        </span>
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
                        onClick={() => void handleDelete()}
                    >🗑</button>
                ) : null}
            </div>
            <ConfirmDialogHost
                dialogState={confirmDlg.dialogState}
                onConfirm={confirmDlg.onConfirm}
                onCancel={confirmDlg.onCancel}
            />
        </div>
    );
}
