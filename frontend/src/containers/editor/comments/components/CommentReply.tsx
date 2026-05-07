import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';

import { Avatar } from '@/editor/shell/Avatar';
import { Reactions } from './Reactions';
import {
    MentionTextarea,
    renderBodyWithMentions,
} from './MentionTextarea';
import { useCommentsView } from './CommentsViewContext';
import { useThread } from '../hooks/useThread';
import { useComments, useCommentsStore } from '../store/CommentsStoreProvider';
import {
    selectEditText,
    selectIsEditingReply,
} from '../store/commentsSelectors';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useConfirmDialog } from '@/components/feedback/useConfirmDialog';
import { ConfirmDialogHost } from '@/components/feedback/ConfirmDialogHost';

interface CommentReplyProps {
    threadId: string;
    replyId: string;
}

export function CommentReply({ threadId, replyId }: CommentReplyProps) {
    const { t } = useTranslation('editor');
    const { user, perms } = useEditorSession();
    const { candidates, formatRelative } = useCommentsView();
    const thread = useThread(threadId);
    const isEditing = useComments(selectIsEditingReply(threadId, replyId));
    const editText = useComments(selectEditText);
    const setEditText = useComments((s) => s.setEditText);
    const commentsStore = useCommentsStore();
    const confirmDlg = useConfirmDialog();

    const reply = thread?.replies.find((r) => r.id === replyId);
    const handleEditSubmit = useCallback(() => {
        commentsStore.getState().editSubmit();
    }, [commentsStore]);
    const handleEditCancel = useCallback(() => {
        commentsStore.getState().cancelEdit();
    }, [commentsStore]);
    const handleEditStart = useCallback(() => {
        if (!reply) return;
        commentsStore.getState().beginEdit(
            { kind: 'reply', threadId, replyId },
            reply.body,
        );
    }, [commentsStore, reply, threadId, replyId]);
    const handleToggleReaction = useCallback((emoji: string) => {
        commentsStore.getState().toggleReplyReaction(threadId, replyId, emoji);
    }, [commentsStore, threadId, replyId]);
    const handleDelete = useCallback(async () => {
        const ok = await confirmDlg.confirm({
            title: t('comments.deleteReplyConfirm'),
            destructive: true,
        });
        if (!ok) return;
        commentsStore.getState().removeReply(threadId, replyId);
    }, [confirmDlg, t, commentsStore, threadId, replyId]);

    if (!thread || !reply) return null;
    const isAuthor = reply.authorId === user.id;
    const canEdit = isAuthor;
    const canDelete = isAuthor || perms.canResolveComment;

    return (
        <div className="thread-reply">
            <Avatar name={reply.authorName} color={reply.authorColor} size="xs" />
            <div className="thread-reply-text">
                <div className="thread-head-row">
                    <span className="thread-author">{reply.authorName}</span>
                    <span className="thread-head-meta">
                        <span className="thread-head-role">{reply.authorRole}</span>
                        <span className="thread-head-dot">·</span>
                        <span className="thread-head-time">{formatRelative(reply.createdAt)}</span>
                    </span>
                </div>
                {isEditing ? (
                    <div className="thread-draft">
                        <MentionTextarea
                            value={editText}
                            onChange={setEditText}
                            placeholder={t('comments.editReply')}
                            autoFocus
                            candidates={candidates}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="thread-actions">
                            <button
                                type="button"
                                className="btn-primary"
                                disabled={!editText.trim()}
                                onClick={(e) => { e.stopPropagation(); handleEditSubmit(); }}
                            >
                                {t('comments.post')}
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleEditCancel(); }}>
                                {t('global.cancel')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="thread-body">
                        {renderBodyWithMentions(reply.body)}
                        {reply.edited ? <span className="thread-edited">{' '}· {t('comments.editedSuffix')}</span> : null}
                        {canEdit ? (
                            <button
                                type="button"
                                className="thread-edit-btn"
                                title={t('comments.editTooltip')}
                                onClick={(e) => { e.stopPropagation(); handleEditStart(); }}
                            >✎</button>
                        ) : null}
                        {canDelete ? (
                            <button
                                type="button"
                                className="thread-edit-btn thread-delete-btn"
                                title={t('comments.deleteReplyTooltip')}
                                aria-label={t('comments.deleteReplyTooltip')}
                                onClick={(e) => { e.stopPropagation(); void handleDelete(); }}
                            >
                                <Trash2 size={12} />
                            </button>
                        ) : null}
                    </div>
                )}
                <Reactions
                    reactions={reply.reactions}
                    myUserId={user.id}
                    onToggle={handleToggleReaction}
                />
            </div>
            <ConfirmDialogHost
                dialogState={confirmDlg.dialogState}
                onConfirm={confirmDlg.onConfirm}
                onCancel={confirmDlg.onCancel}
            />
        </div>
    );
}
