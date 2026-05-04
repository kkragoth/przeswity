import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/editor/shell/Avatar';
import { authorColor } from '@/editor/comments/color';
import { withStop } from '@/utils/react/withStop';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useSession } from '@/containers/editor/SessionStoreProvider';
import { useCommentsStore } from '@/containers/editor/CommentsStoreProvider';
import { useCommentsView } from '@/containers/editor/components/comments/CommentsViewContext';
import { useThread } from '@/containers/editor/components/comments/useThread';
import { useIsActiveComment } from '@/containers/editor/components/comments/useIsActiveComment';

interface ThreadHeaderProps {
    threadId: string;
}

export function ThreadHeader({ threadId }: ThreadHeaderProps) {
    const { t } = useTranslation('editor');
    const { perms } = useEditorSession();
    const { formatRelative, editor } = useCommentsView();
    const thread = useThread(threadId);
    const isActive = useIsActiveComment(threadId);
    const setActiveComment = useSession((s) => s.setActiveComment);
    const commentsStore = useCommentsStore();

    const handleResolve = useCallback(() => {
        if (editor) editor.chain().focus().unsetComment(threadId).run();
        commentsStore.getState().resolveThread(threadId);
        setActiveComment(null);
        commentsStore.getState().cancelEdit();
    }, [editor, commentsStore, setActiveComment, threadId]);

    const handleClose = useCallback(() => {
        setActiveComment(null);
        commentsStore.getState().cancelEdit();
    }, [setActiveComment, commentsStore]);

    if (!thread) return null;
    const replyCount = thread.replies.length;
    const canResolve = perms.canResolveComment;

    return (
        <div className="thread-head">
            <Avatar name={thread.authorName} color={authorColor(thread)} size="md" ring={isActive} />
            <div className="thread-head-text">
                <div className="thread-head-row">
                    <span className="thread-author">{thread.authorName}</span>
                    <span className="thread-role-chip">{thread.authorRole}</span>
                </div>
                <div className="thread-head-time">{formatRelative(thread.createdAt)}</div>
            </div>
            <div className="thread-head-aside">
                {replyCount > 0 && !isActive ? (
                    <span className="thread-reply-count" title={t('comments.repliesCount', { count: replyCount })}>
                        ↳ {replyCount}
                    </span>
                ) : null}
                {canResolve && isActive ? (
                    <button type="button" className="btn-resolve" aria-label={t('comments.resolve')} onClick={withStop(handleResolve)}>
                        ✓ {t('comments.resolve')}
                    </button>
                ) : null}
                {isActive ? (
                    <button type="button" className="thread-close-btn" title={t('comments.close')} aria-label={t('comments.close')} onClick={withStop(handleClose)}>✕</button>
                ) : null}
            </div>
        </div>
    );
}
