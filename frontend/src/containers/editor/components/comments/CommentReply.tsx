import { Avatar } from '@/editor/shell/Avatar';
import { Reactions } from '@/containers/editor/components/comments/Reactions';
import { renderBodyWithMentions } from '@/containers/editor/components/comments/MentionTextarea';
import type { CommentReply as Reply } from '@/editor/comments/types';

export function CommentReply({
    reply,
    timeLabel,
    canEdit,
    onEdit,
    reactionsUserId,
    onToggleReaction,
}: {
    reply: Reply;
    timeLabel: string;
    canEdit: boolean;
    onEdit: () => void;
    reactionsUserId: string;
    onToggleReaction: (emoji: string) => void;
}) {
    return (
        <div className="thread-reply">
            <Avatar name={reply.authorName} color={reply.authorColor} size="sm" />
            <div className="thread-reply-text">
                <div className="thread-head-row">
                    <span className="thread-author">{reply.authorName}</span>
                    <span className="thread-role-chip">{reply.authorRole}</span>
                    <span className="thread-head-time">{timeLabel}</span>
                </div>
                <div className="thread-body">
                    {renderBodyWithMentions(reply.body)}
                    {reply.edited ? <span className="thread-edited"> · edited</span> : null}
                    {canEdit ? <button type="button" className="thread-edit-btn" title="Edit" onClick={onEdit}>✎</button> : null}
                </div>
                <Reactions reactions={reply.reactions} myUserId={reactionsUserId} onToggle={onToggleReaction} />
            </div>
        </div>
    );
}
