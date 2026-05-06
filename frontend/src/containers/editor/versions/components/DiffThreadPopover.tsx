import { useTranslation } from 'react-i18next';
import type { CommentThread } from '@/editor/comments/types';
import { previewBody } from '@/editor/comments/format';
import { DiffCommentSideKind } from '@/containers/editor/versions/hooks/useDiffCommentSources';

function formatTimestamp(ts: number): string {
    return new Date(ts).toLocaleString();
}

interface ThreadRowProps {
    thread: CommentThread;
}

function ThreadRow({ thread }: ThreadRowProps) {
    return (
        <div className="diff-thread-row">
            <div className="diff-thread-meta">
                <span className="diff-thread-author">{thread.authorName}</span>
                <span className="diff-thread-time">{formatTimestamp(thread.createdAt)}</span>
            </div>
            {thread.originalQuote && (
                <div className="diff-thread-quote">"{thread.originalQuote}"</div>
            )}
            {thread.body && (
                <div className="diff-thread-body">{previewBody(thread.body)}</div>
            )}
            {thread.replies.length > 0 && (
                <div className="diff-thread-replies-count">
                    +{thread.replies.length}
                </div>
            )}
        </div>
    );
}

export interface DiffThreadPopoverProps {
    threads: CommentThread[];
    sideLabel: string;
    kind: DiffCommentSideKind;
    onClose: () => void;
}

export function DiffThreadPopover({ threads, sideLabel, kind, onClose }: DiffThreadPopoverProps) {
    const { t } = useTranslation('editor');
    const note = kind === DiffCommentSideKind.Live
        ? t('versions.commentsLive')
        : t('versions.commentsReadOnly');

    return (
        <div className="diff-thread-popover">
            <div className="diff-thread-popover-header">
                <span className="diff-thread-popover-title">{sideLabel}</span>
                <button
                    type="button"
                    className="diff-thread-popover-close"
                    onClick={onClose}
                    aria-label={t('global.close')}
                >
                    ✕
                </button>
            </div>
            <div className="diff-thread-note">{note}</div>
            <div className="diff-thread-list">
                {threads.length === 0 ? (
                    <div className="diff-thread-empty">{t('versions.noComments')}</div>
                ) : (
                    threads.map((th) => <ThreadRow key={th.id} thread={th} />)
                )}
            </div>
        </div>
    );
}
