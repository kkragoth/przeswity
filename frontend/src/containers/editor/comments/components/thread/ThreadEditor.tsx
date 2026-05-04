import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Reactions } from '../Reactions';
import { ThreadComposeForm } from './ThreadComposeForm';
import { renderBodyWithMentions } from '../MentionTextarea';
import { useCommentsView } from '../CommentsViewContext';
import { useThread } from '../../hooks/useThread';
import { useIsActiveComment } from '../../hooks/useIsActiveComment';
import { useComments, useCommentsStore } from '../../store/CommentsStoreProvider';
import {
    selectEditText,
    selectIsEditingThread,
} from '../../store/commentsSelectors';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { withStop } from '@/utils/react/withStop';

interface ThreadEditorProps {
    threadId: string;
}

export function ThreadEditor({ threadId }: ThreadEditorProps) {
    const { t } = useTranslation('editor');
    const { user } = useEditorSession();
    const { candidates } = useCommentsView();
    const thread = useThread(threadId);
    const isActive = useIsActiveComment(threadId);
    const editText = useComments(selectEditText);
    const editingBody = useComments(selectIsEditingThread(threadId));
    const setEditText = useComments((s) => s.setEditText);
    const commentsStore = useCommentsStore();

    const handleEditSubmit = useCallback(() => {
        commentsStore.getState().editSubmit();
    }, [commentsStore]);
    const handleEditCancel = useCallback(() => {
        commentsStore.getState().cancelEdit();
    }, [commentsStore]);
    const handleEditStart = useCallback(() => {
        if (!thread) return;
        commentsStore.getState().beginEdit({ kind: 'thread', threadId }, thread.body);
    }, [commentsStore, thread, threadId]);
    const handleToggleReaction = useCallback((emoji: string) => {
        commentsStore.getState().toggleThreadReaction(threadId, emoji);
    }, [commentsStore, threadId]);

    if (!thread) return null;

    return (
        <div className="thread-message">
            {thread.body && editingBody ? (
                <ThreadComposeForm
                    value={editText}
                    onChange={setEditText}
                    placeholder={t('comments.editComment')}
                    onSubmit={handleEditSubmit}
                    onCancel={handleEditCancel}
                    candidates={candidates}
                />
            ) : thread.body ? (
                <div className="thread-body">
                    {renderBodyWithMentions(thread.body)}
                    {thread.edited ? (
                        <span className="thread-edited" title={new Date(thread.edited).toLocaleString()}>
                            {' '}· {t('comments.editedSuffix')}
                        </span>
                    ) : null}
                    {thread.authorId === user.id ? (
                        <button type="button" className="thread-edit-btn" title={t('comments.editTooltip')} onClick={withStop(handleEditStart)}>✎</button>
                    ) : null}
                </div>
            ) : null}
            {isActive && thread.body ? (
                <Reactions reactions={thread.reactions} myUserId={user.id} onToggle={handleToggleReaction} />
            ) : null}
        </div>
    );
}
