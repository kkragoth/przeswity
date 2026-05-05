import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { Editor } from '@tiptap/react';

import { CommentThreadCard } from '@/containers/editor/comments/components/CommentThreadCard';
import { CommentsViewProvider } from '@/containers/editor/comments/components/CommentsViewContext';
import { useCommentsStore } from '@/containers/editor/comments/store/CommentsStoreProvider';
import { buildCandidates } from '@/editor/comments/mentionCandidates';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useEditorLive } from '@/containers/editor/session/LiveProvider';
import { usePaneStore } from '@/containers/editor/session/paneStore';
import { useSession } from '@/containers/editor/SessionStoreProvider';
import { formatRelativeTime } from '@/lib/dates';
import { ThreadKind, ThreadFilterKind, type UnifiedThread } from './types';
import { ThreadsFilterBar } from './ThreadsFilterBar';
import { SuggestionThreadCard } from './SuggestionThreadCard';
import { useUnifiedThreads } from './useUnifiedThreads';

interface ThreadsSidebarProps {
    editor: Editor | null;
}

interface UnifiedThreadItemProps {
    thread: UnifiedThread;
    activeId: string | null;
    onActivate: (id: string | null) => void;
}

const UnifiedThreadItem = memo(function UnifiedThreadItem({
    thread,
    activeId,
    onActivate,
}: UnifiedThreadItemProps) {
    if (thread.kind === ThreadKind.Comment) {
        return (
            <div data-thread-id={thread.thread.id}>
                <CommentThreadCard threadId={thread.thread.id} />
            </div>
        );
    }
    const id = thread.entry.suggestionId;
    return (
        <SuggestionThreadCard
            entry={thread.entry}
            isActive={activeId === id}
            onSelect={() => onActivate(activeId === id ? null : id)}
        />
    );
});

export function ThreadsSidebar({ editor }: ThreadsSidebarProps) {
    const { t, i18n } = useTranslation('editor');
    const { user, collab } = useEditorSession();
    const peers = useEditorLive((s) => s.peers);
    const hidePane = usePaneStore((s) => s.hide);
    const commentsStore = useCommentsStore();
    const pendingNewComment = useSession((s) => s.pendingNewComment);
    const consumePendingComment = useSession((s) => s.consumePendingComment);
    const setActiveComment = useSession((s) => s.setActiveComment);
    const activeCommentId = useSession((s) => s.activeCommentId);
    const [filter, setFilter] = useState<ThreadFilterKind>(ThreadFilterKind.Open);
    const [activeId, setActiveId] = useState<string | null>(null);
    const hasActive = activeCommentId !== null || activeId !== null;

    const threads = useUnifiedThreads(editor, collab.doc, filter, user);

    useEffect(() => {
        if (!pendingNewComment) return;
        const consumed = consumePendingComment();
        if (!consumed) return;
        commentsStore.getState().createThread(consumed, '');
        setActiveComment(consumed.id);
        // Belt-and-braces focus: the compose textarea has React `autoFocus`, but
        // the editor was just refocused by `setComment` in the same tick — a
        // double-RAF reclaims focus after both renders settle.
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const ta = document.querySelector<HTMLTextAreaElement>(
                `[data-thread-id="${CSS.escape(consumed.id)}"] .thread-draft textarea`,
            );
            ta?.focus();
        }));
    }, [pendingNewComment, commentsStore, consumePendingComment, setActiveComment]);

    // When the editor activates a comment (e.g. user clicks an inline pin),
    // scroll the matching card into view inside the sidebar.
    useEffect(() => {
        if (!activeCommentId) return;
        const el = document.querySelector(`[data-thread-id="${CSS.escape(activeCommentId)}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [activeCommentId]);

    const candidates = useMemo(() => buildCandidates(peers, user.name), [peers, user.name]);
    const formatRelative = useMemo(
        () => (ts: number) => formatRelativeTime(ts, i18n.language, t),
        [i18n.language, t],
    );
    const viewValue = useMemo(
        () => ({ candidates, formatRelative, editor }),
        [candidates, formatRelative, editor],
    );

    const { commentCount, suggestionCount } = useMemo(() => {
        let c = 0;
        let s = 0;
        for (const th of threads) {
            if (th.kind === ThreadKind.Comment) c++;
            else s++;
        }
        return { commentCount: c, suggestionCount: s };
    }, [threads]);
    const handleHidePane = useCallback(() => hidePane('right'), [hidePane]);

    return (
        <CommentsViewProvider value={viewValue}>
            <div className={`sidebar threads-sidebar${hasActive ? ' has-active' : ''}`}>
                <div className="pane-tabs" style={{ borderBottom: 'none' }}>
                    <span className="pane-tab is-active" style={{ pointerEvents: 'none' }}>
                        {t('threads.title')}
                        {commentCount + suggestionCount > 0
                            ? ` (${commentCount + suggestionCount})` : ''}
                    </span>
                    <div className="pane-tabs-spacer" />
                    <button
                        type="button"
                        className="pane-tab-close"
                        onClick={handleHidePane}
                        aria-label={t('pane.collapse')}
                    >
                        <X size={14} />
                    </button>
                </div>

                <ThreadsFilterBar active={filter} onChange={setFilter} />

                {threads.length === 0 ? (
                    <div className="sidebar-empty">
                        {t('threads.empty')}
                    </div>
                ) : (
                    <div className="threads-list">
                        {threads.map((th) => (
                            <UnifiedThreadItem
                                key={th.kind === ThreadKind.Comment ? th.thread.id : th.entry.suggestionId}
                                thread={th}
                                activeId={activeId}
                                onActivate={setActiveId}
                            />
                        ))}
                    </div>
                )}
            </div>
        </CommentsViewProvider>
    );
}
