import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronUp, MoreHorizontal, Trash2 } from 'lucide-react';

import { Avatar } from '@/editor/shell/Avatar';
import { authorColor } from '@/editor/comments/authorColor';
import { withStop } from '@/utils/react/withStop';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useSession, useSessionStore } from '@/containers/editor/SessionStoreProvider';
import { useConfirmDialog } from '@/components/feedback/useConfirmDialog';
import { ConfirmDialogHost } from '@/components/feedback/ConfirmDialogHost';
import { useToast } from '@/editor/shell/useToast';
import { useCommentsStore } from '../../store/CommentsStoreProvider';
import { useCommentsView } from '../CommentsViewContext';
import { useThread } from '../../hooks/useThread';
import { useIsActiveComment } from '../../hooks/useIsActiveComment';

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
    const sessionStore = useSessionStore();
    const commentsStore = useCommentsStore();
    const confirmDlg = useConfirmDialog();
    const { showWithUndo } = useToast();

    const handleResolve = useCallback(() => {
        // Pure y-doc status change — see CommentAnchors.handleResolve for why
        // we don't touch the editor mark here.
        commentsStore.getState().resolveThread(threadId);
        setActiveComment(null);
        commentsStore.getState().cancelEdit();
        showWithUndo(t('comments.resolvedToast'), {
            label: t('comments.undo'),
            onUndo: () => commentsStore.getState().reopenThread(threadId),
        });
    }, [commentsStore, setActiveComment, threadId, showWithUndo, t]);

    const handleClose = useCallback(() => {
        setActiveComment(null);
        commentsStore.getState().cancelEdit();
    }, [setActiveComment, commentsStore]);

    const handleDelete = useCallback(async () => {
        const ok = await confirmDlg.confirm({ title: t('comments.deleteConfirm'), destructive: true });
        if (!ok) return;
        commentsStore.getState().removeThread(threadId);
        if (editor) editor.chain().focus().unsetComment(threadId).run();
        if (sessionStore.getState().activeCommentId === threadId) {
            setActiveComment(null);
            commentsStore.getState().cancelEdit();
        }
    }, [confirmDlg, t, commentsStore, editor, sessionStore, setActiveComment, threadId]);

    if (!thread) return null;
    const replyCount = thread.replies.length;
    const canResolve = perms.canResolveComment;

    return (
        <div className="thread-head">
            <Avatar name={thread.authorName} color={authorColor(thread)} size="sm" ring={isActive} />
            <div className="thread-head-text">
                <div className="thread-head-row">
                    <span className="thread-author">{thread.authorName}</span>
                    <span className="thread-head-meta">
                        <span className="thread-head-role">{thread.authorRole}</span>
                        <span className="thread-head-dot">·</span>
                        <span className="thread-head-time">{formatRelative(thread.createdAt)}</span>
                    </span>
                </div>
            </div>
            <div className="thread-head-aside">
                {replyCount > 0 && !isActive ? (
                    <span className="thread-reply-count" title={t('comments.repliesCount', { count: replyCount })}>
                        💬 {replyCount}
                    </span>
                ) : null}
                {canResolve && isActive ? (
                    <button type="button" className="btn-resolve" aria-label={t('comments.resolve')} onClick={withStop(handleResolve)}>
                        <Check size={13} strokeWidth={2.5} />
                        {t('comments.resolve')}
                    </button>
                ) : null}
                {canResolve && isActive ? (
                    <DropdownMenuPrimitive.Root>
                        <DropdownMenuPrimitive.Trigger asChild>
                            <button
                                type="button"
                                className="thread-icon-btn thread-menu-btn"
                                title={t('comments.moreActions')}
                                aria-label={t('comments.moreActions')}
                                onClick={withStop(() => {})}
                            >
                                <MoreHorizontal size={14} />
                            </button>
                        </DropdownMenuPrimitive.Trigger>
                        <DropdownMenuPrimitive.Portal>
                            <DropdownMenuPrimitive.Content align="end" sideOffset={4} className="topbar-dropdown-content">
                                <DropdownMenuPrimitive.Item
                                    className="topbar-dropdown-item topbar-dropdown-item--danger"
                                    onSelect={() => void handleDelete()}
                                >
                                    <Trash2 size={14} />
                                    {t('comments.deleteThread')}
                                </DropdownMenuPrimitive.Item>
                            </DropdownMenuPrimitive.Content>
                        </DropdownMenuPrimitive.Portal>
                    </DropdownMenuPrimitive.Root>
                ) : null}
                {isActive ? (
                    <button type="button" className="thread-collapse-btn" title={t('comments.close')} aria-label={t('comments.close')} onClick={withStop(handleClose)}>
                        <ChevronUp size={14} strokeWidth={2.25} />
                    </button>
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
