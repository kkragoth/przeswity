import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/editor/shell/Avatar';
import { authorColor } from '@/editor/comments/color';
import type { CommentThread } from '@/editor/comments/types';
import { Reactions } from '@/containers/editor/components/comments/Reactions';
import { CommentReply } from '@/containers/editor/components/comments/CommentReply';
import { type MentionCandidate, renderBodyWithMentions } from '@/containers/editor/components/comments/MentionTextarea';
import type { CommentEditTarget } from '@/containers/editor/hooks/useCommentDrafts';
import { ThreadComposeForm } from '@/containers/editor/components/comments/thread/ThreadComposeForm';
import { ThreadReplyCompose } from '@/containers/editor/components/comments/thread/ThreadReplyCompose';
import { withStop } from '@/utils/react/withStop';

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
            <div className="thread-head">
                <Avatar name={thread.authorName} color={authorColor(thread)} size="md" ring={isActive} />
                <div className="thread-head-text">
                    <div className="thread-head-row">
                        <span className="thread-author">{thread.authorName}</span>
                        <span className="thread-role-chip">{thread.authorRole}</span>
                    </div>
                    <div className="thread-head-time">{props.timeLabel}</div>
                </div>
                <div className="thread-head-aside">
                    {thread.replies.length > 0 && !isActive ? (
                        <span className="thread-reply-count" title={t('comments.repliesCount', { count: thread.replies.length })}>
                            ↳ {thread.replies.length}
                        </span>
                    ) : null}
                    {props.canResolve && isActive ? (
                        <button type="button" className="btn-resolve" aria-label={t('comments.resolve')} onClick={withStop(cb.onResolve)}>
                            ✓ {t('comments.resolve')}
                        </button>
                    ) : null}
                    {isActive ? (
                        <button type="button" className="thread-close-btn" title={t('comments.close')} aria-label={t('comments.close')} onClick={withStop(cb.onClose)}>✕</button>
                    ) : null}
                </div>
            </div>
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
                            <div className="thread-message">
                                {thread.body && editingThreadBody ? (
                                    <ThreadComposeForm
                                        value={props.editText}
                                        onChange={props.onEditTextChange}
                                        placeholder={t('comments.editComment')}
                                        onSubmit={cb.onEditSubmit}
                                        onCancel={cb.onEditCancel}
                                        candidates={props.candidates}
                                    />
                                ) : thread.body ? (
                                    <div className="thread-body">
                                        {renderBodyWithMentions(thread.body)}
                                        {thread.edited ? (
                                            <span className="thread-edited" title={new Date(thread.edited).toLocaleString()}>
                                                {' '}· {t('comments.editedSuffix')}
                                            </span>
                                        ) : null}
                                        {thread.authorId === props.currentUserId ? (
                                            <button type="button" className="thread-edit-btn" title={t('comments.editTooltip')} onClick={withStop(cb.onEditThreadStart)}>✎</button>
                                        ) : null}
                                    </div>
                                ) : null}
                                {isActive && thread.body ? (
                                    <Reactions reactions={thread.reactions} myUserId={props.currentUserId} onToggle={cb.onToggleThreadReaction} />
                                ) : null}
                            </div>

                            {thread.replies.map((reply) => {
                                const isEditingReply =
                                    props.editTarget?.kind === 'reply'
                                    && props.editTarget.threadId === thread.id
                                    && props.editTarget.replyId === reply.id;
                                return (
                                    <CommentReply
                                        key={reply.id}
                                        reply={reply}
                                        timeLabel={props.replyTimeLabel(reply.createdAt)}
                                        canEdit={reply.authorId === props.currentUserId}
                                        isEditing={isEditingReply}
                                        editValue={props.editText}
                                        onEditChange={props.onEditTextChange}
                                        onEditStart={() => cb.onEditReplyStart(reply.id)}
                                        onEditCancel={cb.onEditCancel}
                                        onEditSubmit={cb.onEditSubmit}
                                        candidates={props.candidates}
                                        currentUserId={props.currentUserId}
                                        onToggleReaction={(e) => cb.onToggleReplyReaction(reply.id, e)}
                                    />
                                );
                            })}

                            {props.canComment && thread.body && isActive ? (
                                <ThreadReplyCompose
                                    replyDraft={props.replyDraft}
                                    onChange={props.onReplyDraftChange}
                                    onSubmit={cb.onSubmitReply}
                                    onRemove={cb.onRemove}
                                    canResolve={props.canResolve}
                                    candidates={props.candidates}
                                />
                            ) : null}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
});
