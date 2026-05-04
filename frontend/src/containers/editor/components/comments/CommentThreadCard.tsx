import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { previewBody } from '@/editor/comments/format';
import { ThreadComposeForm } from '@/containers/editor/components/comments/thread/ThreadComposeForm';
import { ThreadHeader } from '@/containers/editor/components/comments/thread/ThreadHeader';
import { ThreadEditor } from '@/containers/editor/components/comments/thread/ThreadEditor';
import { ThreadReplies } from '@/containers/editor/components/comments/thread/ThreadReplies';
import { useCommentsStore } from '@/containers/editor/CommentsStoreProvider';
import { useCommentsView } from '@/containers/editor/components/comments/CommentsViewContext';
import { useThread } from '@/containers/editor/components/comments/useThread';
import { useIsActiveComment } from '@/containers/editor/components/comments/useIsActiveComment';
import { useComments } from '@/containers/editor/CommentsStoreProvider';
import { selectInitialDraft } from '@/containers/editor/stores/commentsSelectors';
import { useSession, useSessionStore } from '@/containers/editor/SessionStoreProvider';

interface CommentThreadCardProps {
    threadId: string;
}

export const CommentThreadCard = memo(function CommentThreadCard({ threadId }: CommentThreadCardProps) {
    const { t } = useTranslation('editor');
    const thread = useThread(threadId);
    const isActive = useIsActiveComment(threadId);
    const { candidates, editor } = useCommentsView();
    const initialDraft = useComments(selectInitialDraft);
    const setInitialDraft = useComments((s) => s.setInitialDraft);
    const commentsStore = useCommentsStore();
    const sessionStore = useSessionStore();
    const setActiveComment = useSession((s) => s.setActiveComment);

    const handleSelect = useCallback(() => {
        setActiveComment(threadId);
        commentsStore.getState().cancelEdit();
    }, [setActiveComment, threadId, commentsStore]);

    const handleSubmitInitial = useCallback(() => {
        commentsStore.getState().submitInitialBody(threadId);
    }, [commentsStore, threadId]);

    const handleRemoveOnEmpty = useCallback(() => {
        commentsStore.getState().removeThread(threadId);
        if (editor) editor.chain().focus().unsetComment(threadId).run();
        if (sessionStore.getState().activeCommentId === threadId) {
            setActiveComment(null);
            commentsStore.getState().cancelEdit();
        }
    }, [commentsStore, editor, sessionStore, setActiveComment, threadId]);

    if (!thread) return null;
    const draftEmpty = thread.body === '';

    return (
        <div className={`thread${isActive ? ' is-active' : ''}`} onClick={handleSelect}>
            <ThreadHeader threadId={threadId} />
            <div className="thread-quote">"{thread.originalQuote}"</div>

            {draftEmpty && isActive ? (
                <ThreadComposeForm
                    value={initialDraft}
                    onChange={setInitialDraft}
                    placeholder={t('comments.writeComment')}
                    onSubmit={handleSubmitInitial}
                    onCancel={handleRemoveOnEmpty}
                    candidates={candidates}
                />
            ) : (
                <>
                    {thread.body && !isActive ? (
                        <div className="thread-preview">{previewBody(thread.body)}</div>
                    ) : null}
                    <div className="thread-expandable">
                        <div className="thread-expandable-inner">
                            <ThreadEditor threadId={threadId} />
                            <ThreadReplies threadId={threadId} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
});
