import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { CommentThread } from '@/editor/comments/types';
import type { MentionCandidate } from '@/containers/editor/components/comments/MentionTextarea';
import type { CommentEditTarget } from '@/containers/editor/hooks/useCommentDrafts';
import { ThreadComposeForm } from '@/containers/editor/components/comments/thread/ThreadComposeForm';
import { ThreadHeader } from '@/containers/editor/components/comments/thread/ThreadHeader';
import { ThreadEditor } from '@/containers/editor/components/comments/thread/ThreadEditor';
import { ThreadReplies } from '@/containers/editor/components/comments/thread/ThreadReplies';

function previewBody(body: string, max = 90): string {
    const single = body.replace(/\s+/g, ' ').trim();
    if (single.length <= max) return single;
    return single.slice(0, max - 1) + '…';
}

export interface ThreadCallbacks {
    onSelect: () => void;
    onClose: () => void;
    onResolve: () => void;
    onRemove: () => void;
    onSubmitInitialBody: () => void;
    onSubmitReply: () => void;
    onEditThreadStart: () => void;
    onEditReplyStart: (replyId: string) => void;
    onEditCancel: () => void;
    onEditSubmit: () => void;
    onToggleThreadReaction: (emoji: string) => void;
    onToggleReplyReaction: (replyId: string, emoji: string) => void;
}

interface CommentThreadCardProps {
    thread: CommentThread;
    isActive: boolean;
    timeLabel: string;
    replyTimeLabel: (ts: number) => string;
    canResolve: boolean;
    canComment: boolean;
    currentUserId: string;
    candidates: MentionCandidate[];
    initialDraft: string;
    onInitialDraftChange: (next: string) => void;
    replyDraft: string;
    onReplyDraftChange: (next: string) => void;
    editTarget: CommentEditTarget;
    editText: string;
    onEditTextChange: (next: string) => void;
    callbacks: ThreadCallbacks;
}

export const CommentThreadCard = memo(function CommentThreadCard(props: CommentThreadCardProps) {
    const { t } = useTranslation('editor');
    const { thread, isActive, callbacks: cb } = props;
    const draftEmpty = thread.body === '';
    const editingThreadBody = props.editTarget?.kind === 'thread' && props.editTarget.threadId === thread.id;

    return (
        <div className={`thread${isActive ? ' is-active' : ''}`} onClick={cb.onSelect}>
            <ThreadHeader
                thread={thread}
                isActive={isActive}
                timeLabel={props.timeLabel}
                canResolve={props.canResolve}
                replyCount={thread.replies.length}
                onResolve={cb.onResolve}
                onClose={cb.onClose}
            />
            <div className="thread-quote">"{thread.originalQuote}"</div>

            {draftEmpty && isActive ? (
                <ThreadComposeForm
                    value={props.initialDraft}
                    onChange={props.onInitialDraftChange}
                    placeholder={t('comments.writeComment')}
                    onSubmit={cb.onSubmitInitialBody}
                    onCancel={cb.onRemove}
                    candidates={props.candidates}
                />
            ) : (
                <>
                    {thread.body && !isActive ? (
                        <div className="thread-preview">{previewBody(thread.body)}</div>
                    ) : null}
                    <div className="thread-expandable">
                        <div className="thread-expandable-inner">
                            <ThreadEditor
                                thread={thread}
                                isActive={isActive}
                                editingBody={editingThreadBody}
                                editText={props.editText}
                                onEditTextChange={props.onEditTextChange}
                                onEditSubmit={cb.onEditSubmit}
                                onEditCancel={cb.onEditCancel}
                                onEditThreadStart={cb.onEditThreadStart}
                                onToggleThreadReaction={cb.onToggleThreadReaction}
                                currentUserId={props.currentUserId}
                                candidates={props.candidates}
                            />
                            <ThreadReplies
                                thread={thread}
                                isActive={isActive}
                                replyTimeLabel={props.replyTimeLabel}
                                editTarget={props.editTarget}
                                editText={props.editText}
                                onEditTextChange={props.onEditTextChange}
                                onEditReplyStart={cb.onEditReplyStart}
                                onEditCancel={cb.onEditCancel}
                                onEditSubmit={cb.onEditSubmit}
                                onToggleReplyReaction={cb.onToggleReplyReaction}
                                replyDraft={props.replyDraft}
                                onReplyDraftChange={props.onReplyDraftChange}
                                onSubmitReply={cb.onSubmitReply}
                                onRemove={cb.onRemove}
                                canResolve={props.canResolve}
                                canComment={props.canComment}
                                currentUserId={props.currentUserId}
                                candidates={props.candidates}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
});
