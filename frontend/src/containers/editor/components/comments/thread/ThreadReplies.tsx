import { CommentReply } from '@/containers/editor/components/comments/CommentReply';
import { ThreadReplyCompose } from '@/containers/editor/components/comments/thread/ThreadReplyCompose';
import type { MentionCandidate } from '@/containers/editor/components/comments/MentionTextarea';
import type { CommentEditTarget } from '@/containers/editor/hooks/useCommentDrafts';
import type { CommentThread } from '@/editor/comments/types';

interface ThreadRepliesProps {
    thread: CommentThread;
    isActive: boolean;
    replyTimeLabel: (ts: number) => string;
    editTarget: CommentEditTarget;
    editText: string;
    onEditTextChange: (next: string) => void;
    onEditReplyStart: (replyId: string) => void;
    onEditCancel: () => void;
    onEditSubmit: () => void;
    onToggleReplyReaction: (replyId: string, emoji: string) => void;
    replyDraft: string;
    onReplyDraftChange: (next: string) => void;
    onSubmitReply: () => void;
    onRemove: () => void;
    canResolve: boolean;
    canComment: boolean;
    currentUserId: string;
    candidates: MentionCandidate[];
}

export function ThreadReplies({
    thread,
    isActive,
    replyTimeLabel,
    editTarget,
    editText,
    onEditTextChange,
    onEditReplyStart,
    onEditCancel,
    onEditSubmit,
    onToggleReplyReaction,
    replyDraft,
    onReplyDraftChange,
    onSubmitReply,
    onRemove,
    canResolve,
    canComment,
    currentUserId,
    candidates,
}: ThreadRepliesProps) {
    return (
        <>
            {thread.replies.map((reply) => {
                const isEditingReply =
                    editTarget?.kind === 'reply'
                    && editTarget.threadId === thread.id
                    && editTarget.replyId === reply.id;
                return (
                    <CommentReply
                        key={reply.id}
                        reply={reply}
                        timeLabel={replyTimeLabel(reply.createdAt)}
                        canEdit={reply.authorId === currentUserId}
                        isEditing={isEditingReply}
                        editValue={editText}
                        onEditChange={onEditTextChange}
                        onEditStart={() => onEditReplyStart(reply.id)}
                        onEditCancel={onEditCancel}
                        onEditSubmit={onEditSubmit}
                        candidates={candidates}
                        currentUserId={currentUserId}
                        onToggleReaction={(e) => onToggleReplyReaction(reply.id, e)}
                    />
                );
            })}
            {canComment && thread.body && isActive ? (
                <ThreadReplyCompose
                    replyDraft={replyDraft}
                    onChange={onReplyDraftChange}
                    onSubmit={onSubmitReply}
                    onRemove={onRemove}
                    canResolve={canResolve}
                    candidates={candidates}
                />
            ) : null}
        </>
    );
}
