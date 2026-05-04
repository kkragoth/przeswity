import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/editor/shell/Avatar';
import { Reactions } from '@/containers/editor/components/comments/Reactions';
import {
    MentionTextarea,
    renderBodyWithMentions,
} from '@/containers/editor/components/comments/MentionTextarea';
import { useCommentsView } from '@/containers/editor/components/comments/CommentsViewContext';
import { useThread } from '@/containers/editor/components/comments/useThread';
import { useComments, useCommentsStore } from '@/containers/editor/CommentsStoreProvider';
import {
    selectEditText,
    selectIsEditingReply,
} from '@/containers/editor/stores/commentsSelectors';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';

interface CommentReplyProps {
    threadId: string;
    replyId: string;
}

export function CommentReply({ threadId, replyId }: CommentReplyProps) {
    const { t } = useTranslation('editor');
    const { user } = useEditorSession();
    const { candidates, formatRelative } = useCommentsView();
    const thread = useThread(threadId);
    const isEditing = useComments(selectIsEditingReply(threadId, replyId));
    const editText = useComments(selectEditText);
    const setEditText = useComments((s) => s.setEditText);
    const commentsStore = useCommentsStore();

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

    if (!thread || !reply) return null;
    const canEdit = reply.authorId === user.id;

    return (
        <div className="thread-reply">
            <Avatar name={reply.authorName} color={reply.authorColor} size="sm" />
            <div className="thread-reply-text">
                <div className="thread-head-row">
                    <span className="thread-author">{reply.authorName}</span>
                    <span className="thread-role-chip">{reply.authorRole}</span>
                    <span className="thread-head-time">{formatRelative(reply.createdAt)}</span>
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
                    </div>
                )}
                <Reactions
                    reactions={reply.reactions}
                    myUserId={user.id}
                    onToggle={handleToggleReaction}
                />
            </div>
        </div>
    );
}
