import { useCallback } from 'react';

import { CommentReply } from '../CommentReply';
import { ThreadReplyCompose } from './ThreadReplyCompose';
import { useCommentsView } from '../CommentsViewContext';
import { useThread } from '../../hooks/useThread';
import { useIsActiveComment } from '../../hooks/useIsActiveComment';
import { useComments, useCommentsStore } from '../../store/CommentsStoreProvider';
import { selectReplyDraft } from '../../store/commentsSelectors';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';

interface ThreadRepliesProps {
    threadId: string;
}

export function ThreadReplies({ threadId }: ThreadRepliesProps) {
    const { perms } = useEditorSession();
    const { candidates } = useCommentsView();
    const thread = useThread(threadId);
    const isActive = useIsActiveComment(threadId);
    const replyDraft = useComments(selectReplyDraft(threadId));
    const setReplyDraft = useComments((s) => s.setReplyDraft);
    const commentsStore = useCommentsStore();

    const handleSubmitReply = useCallback(() => {
        commentsStore.getState().submitReply(threadId);
    }, [commentsStore, threadId]);
    const handleChange = useCallback((v: string) => {
        setReplyDraft(threadId, v);
    }, [setReplyDraft, threadId]);

    if (!thread) return null;

    return (
        <>
            {thread.replies.map((reply) => (
                <CommentReply key={reply.id} threadId={threadId} replyId={reply.id} />
            ))}
            {perms.canComment && thread.body && isActive ? (
                <ThreadReplyCompose
                    replyDraft={replyDraft}
                    onChange={handleChange}
                    onSubmit={handleSubmitReply}
                    candidates={candidates}
                />
            ) : null}
        </>
    );
}
