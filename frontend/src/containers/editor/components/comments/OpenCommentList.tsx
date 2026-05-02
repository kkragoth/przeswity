import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '@/lib/dates';
import type { CommentThread } from '@/editor/comments/types';
import type { ThreadCallbacks } from '@/containers/editor/components/comments/CommentThreadCard';
import { CommentThreadCard } from '@/containers/editor/components/comments/CommentThreadCard';
import type { MentionCandidate } from '@/containers/editor/components/comments/MentionTextarea';
import type { CommentEditTarget } from '@/containers/editor/hooks/useCommentDrafts';

interface OpenCommentListProps {
    threads: CommentThread[];
    activeCommentId: string | null;
    callbacksMap: Map<string, ThreadCallbacks>;
    cardsRef: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
    canResolve: boolean;
    canComment: boolean;
    currentUserId: string;
    candidates: MentionCandidate[];
    initialDraft: string;
    onInitialDraftChange: (next: string) => void;
    replyDrafts: Record<string, string>;
    onReplyDraftChange: (threadId: string, next: string) => void;
    editTarget: CommentEditTarget;
    editText: string;
    onEditTextChange: (next: string) => void;
}

export function OpenCommentList({
    threads,
    activeCommentId,
    callbacksMap,
    cardsRef,
    canResolve,
    canComment,
    currentUserId,
    candidates,
    initialDraft,
    onInitialDraftChange,
    replyDrafts,
    onReplyDraftChange,
    editTarget,
    editText,
    onEditTextChange,
}: OpenCommentListProps) {
    const { i18n, t } = useTranslation('editor');

    return (
        <>
            {threads.map((thread) => (
                <div
                    key={thread.id}
                    ref={(el) => {
                        cardsRef.current[thread.id] = el;
                    }}
                >
                    <CommentThreadCard
                        thread={thread}
                        isActive={thread.id === activeCommentId}
                        timeLabel={formatRelativeTime(thread.createdAt, i18n.language, t)}
                        replyTimeLabel={(ts) => formatRelativeTime(ts, i18n.language, t)}
                        canResolve={canResolve}
                        canComment={canComment}
                        currentUserId={currentUserId}
                        candidates={candidates}
                        initialDraft={initialDraft}
                        onInitialDraftChange={onInitialDraftChange}
                        replyDraft={replyDrafts[thread.id] ?? ''}
                        onReplyDraftChange={(v) => onReplyDraftChange(thread.id, v)}
                        editTarget={editTarget}
                        editText={editText}
                        onEditTextChange={onEditTextChange}
                        callbacks={callbacksMap.get(thread.id)!}
                    />
                </div>
            ))}
        </>
    );
}
