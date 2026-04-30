import { memo } from 'react';
import { Avatar } from '@/editor/shell/Avatar';
import { authorColor } from '@/editor/comments/color';
import type { CommentThread } from '@/editor/comments/types';
import { renderBodyWithMentions } from '@/containers/editor/components/comments/MentionTextarea';

export const CommentThreadCard = memo(function CommentThreadCard({
    thread,
    isActive,
    timeLabel,
    onSelect,
}: {
    thread: CommentThread;
    isActive: boolean;
    timeLabel: string;
    onSelect: () => void;
}) {
    return (
        <div className={`thread${isActive ? ' is-active' : ''}`} onClick={onSelect}>
            <div className="thread-head">
                <Avatar name={thread.authorName} color={authorColor(thread)} size="md" ring={isActive} />
                <div className="thread-head-text">
                    <div className="thread-head-row">
                        <span className="thread-author">{thread.authorName}</span>
                        <span className="thread-role-chip">{thread.authorRole}</span>
                    </div>
                    <div className="thread-head-time">{timeLabel}</div>
                </div>
            </div>
            <div className="thread-quote">"{thread.originalQuote}"</div>
            {thread.body ? <div className="thread-body">{renderBodyWithMentions(thread.body)}</div> : null}
        </div>
    );
}, (a, b) => a.thread === b.thread && a.isActive === b.isActive && a.timeLabel === b.timeLabel);
