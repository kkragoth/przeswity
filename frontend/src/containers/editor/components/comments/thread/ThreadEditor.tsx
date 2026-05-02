import { useTranslation } from 'react-i18next';
import { Reactions } from '@/containers/editor/components/comments/Reactions';
import { ThreadComposeForm } from '@/containers/editor/components/comments/thread/ThreadComposeForm';
import type { MentionCandidate } from '@/containers/editor/components/comments/MentionTextarea';
import { renderBodyWithMentions } from '@/containers/editor/components/comments/MentionTextarea';
import type { CommentThread } from '@/editor/comments/types';
import { withStop } from '@/utils/react/withStop';

interface ThreadEditorProps {
    thread: CommentThread;
    isActive: boolean;
    editingBody: boolean;
    editText: string;
    onEditTextChange: (next: string) => void;
    onEditSubmit: () => void;
    onEditCancel: () => void;
    onEditThreadStart: () => void;
    onToggleThreadReaction: (emoji: string) => void;
    currentUserId: string;
    candidates: MentionCandidate[];
}

export function ThreadEditor({
    thread,
    isActive,
    editingBody,
    editText,
    onEditTextChange,
    onEditSubmit,
    onEditCancel,
    onEditThreadStart,
    onToggleThreadReaction,
    currentUserId,
    candidates,
}: ThreadEditorProps) {
    const { t } = useTranslation('editor');
    return (
        <div className="thread-message">
            {thread.body && editingBody ? (
                <ThreadComposeForm
                    value={editText}
                    onChange={onEditTextChange}
                    placeholder={t('comments.editComment')}
                    onSubmit={onEditSubmit}
                    onCancel={onEditCancel}
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
                    {thread.authorId === currentUserId ? (
                        <button type="button" className="thread-edit-btn" title={t('comments.editTooltip')} onClick={withStop(onEditThreadStart)}>✎</button>
                    ) : null}
                </div>
            ) : null}
            {isActive && thread.body ? (
                <Reactions reactions={thread.reactions} myUserId={currentUserId} onToggle={onToggleThreadReaction} />
            ) : null}
        </div>
    );
}
