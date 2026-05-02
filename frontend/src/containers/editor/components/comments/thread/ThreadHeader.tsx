import { useTranslation } from 'react-i18next';
import { Avatar } from '@/editor/shell/Avatar';
import { authorColor } from '@/editor/comments/color';
import type { CommentThread } from '@/editor/comments/types';
import { withStop } from '@/utils/react/withStop';

interface ThreadHeaderProps {
    thread: CommentThread;
    isActive: boolean;
    timeLabel: string;
    canResolve: boolean;
    onResolve: () => void;
    onClose: () => void;
    replyCount: number;
}

export function ThreadHeader({ thread, isActive, timeLabel, canResolve, onResolve, onClose, replyCount }: ThreadHeaderProps) {
    const { t } = useTranslation('editor');
    return (
        <div className="thread-head">
            <Avatar name={thread.authorName} color={authorColor(thread)} size="md" ring={isActive} />
            <div className="thread-head-text">
                <div className="thread-head-row">
                    <span className="thread-author">{thread.authorName}</span>
                    <span className="thread-role-chip">{thread.authorRole}</span>
                </div>
                <div className="thread-head-time">{timeLabel}</div>
            </div>
            <div className="thread-head-aside">
                {replyCount > 0 && !isActive ? (
                    <span className="thread-reply-count" title={t('comments.repliesCount', { count: replyCount })}>
                        ↳ {replyCount}
                    </span>
                ) : null}
                {canResolve && isActive ? (
                    <button type="button" className="btn-resolve" aria-label={t('comments.resolve')} onClick={withStop(onResolve)}>
                        ✓ {t('comments.resolve')}
                    </button>
                ) : null}
                {isActive ? (
                    <button type="button" className="thread-close-btn" title={t('comments.close')} aria-label={t('comments.close')} onClick={withStop(onClose)}>✕</button>
                ) : null}
            </div>
        </div>
    );
}
