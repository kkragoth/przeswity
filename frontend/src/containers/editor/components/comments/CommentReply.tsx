import { useTranslation } from 'react-i18next';
import { Avatar } from '@/editor/shell/Avatar';
import { Reactions } from '@/containers/editor/components/comments/Reactions';
import {
    MentionTextarea,
    renderBodyWithMentions,
    type MentionCandidate,
} from '@/containers/editor/components/comments/MentionTextarea';
import type { CommentReply as Reply } from '@/editor/comments/types';

interface CommentReplyProps {
    reply: Reply;
    timeLabel: string;
    canEdit: boolean;
    isEditing: boolean;
    editValue: string;
    onEditChange: (next: string) => void;
    onEditStart: () => void;
    onEditCancel: () => void;
    onEditSubmit: () => void;
    candidates: MentionCandidate[];
    currentUserId: string;
    onToggleReaction: (emoji: string) => void;
}

export function CommentReply(props: CommentReplyProps) {
    const { t } = useTranslation('editor');
    const r = props.reply;
    return (
        <div className="thread-reply">
            <Avatar name={r.authorName} color={r.authorColor} size="sm" />
            <div className="thread-reply-text">
                <div className="thread-head-row">
                    <span className="thread-author">{r.authorName}</span>
                    <span className="thread-role-chip">{r.authorRole}</span>
                    <span className="thread-head-time">{props.timeLabel}</span>
                </div>
                {props.isEditing ? (
                    <div className="thread-draft">
                        <MentionTextarea
                            value={props.editValue}
                            onChange={props.onEditChange}
                            placeholder={t('comments.editReply')}
                            autoFocus
                            candidates={props.candidates}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="thread-actions">
                            <button
                                type="button"
                                className="btn-primary"
                                disabled={!props.editValue.trim()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    props.onEditSubmit();
                                }}
                            >
                                {t('comments.post')}
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); props.onEditCancel(); }}>
                                {t('global.cancel')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="thread-body">
                        {renderBodyWithMentions(r.body)}
                        {r.edited ? <span className="thread-edited"> · edited</span> : null}
                        {props.canEdit ? (
                            <button
                                type="button"
                                className="thread-edit-btn"
                                title="Edit"
                                onClick={(e) => { e.stopPropagation(); props.onEditStart(); }}
                            >✎</button>
                        ) : null}
                    </div>
                )}
                <Reactions reactions={r.reactions} myUserId={props.currentUserId} onToggle={props.onToggleReaction} />
            </div>
        </div>
    );
}
