import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
import { shallow } from 'zustand/shallow';

import { useThreads } from '@/editor/comments/useThreads';
import { CommentStatus } from '@/editor/comments/types';
import { buildCandidates } from '@/containers/editor/components/comments/mentionCandidates';
import { CommentFilters } from '@/containers/editor/components/comments/CommentFilters';
import { OpenCommentList } from '@/containers/editor/components/comments/OpenCommentList';
import { ResolvedCommentList } from '@/containers/editor/components/comments/ResolvedCommentList';
import { CommentsViewProvider } from '@/containers/editor/components/comments/CommentsViewContext';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useEditorLive } from '@/containers/editor/session/LiveProvider';
import { useSession, useSessionStore } from '@/containers/editor/SessionStoreProvider';
import {
    useComments,
    useCommentsStore,
} from '@/containers/editor/CommentsStoreProvider';
import {
    selectAuthors,
    selectFilter,
    selectOpenResolved,
    selectVisible,
} from '@/containers/editor/stores/commentsSelectors';
import { CommentStatusFilter } from '@/containers/editor/stores/createCommentsStore';
import { formatRelativeTime } from '@/lib/dates';

interface CommentsSidebarProps {
    editor: Editor | null;
}

export function CommentsSidebar(props: CommentsSidebarProps) {
    const { t, i18n } = useTranslation('editor');
    const { user, perms, collab } = useEditorSession();
    const peers = useEditorLive((s) => s.peers);
    const activeCommentId = useSession((s) => s.activeCommentId);
    const pendingNewComment = useSession((s) => s.pendingNewComment);
    const setActiveComment = useSession((s) => s.setActiveComment);
    const consumePendingComment = useSession((s) => s.consumePendingComment);
    const sessionStore = useSessionStore();
    const commentsStore = useCommentsStore();
    const filter = useComments(selectFilter, shallow);
    const doc = collab.doc;
    const threads = useThreads(doc);

    const visible = useMemo(() => selectVisible(threads, filter, user), [threads, filter, user]);
    const { open, resolved } = useMemo(() => selectOpenResolved(visible), [visible]);
    const allAuthors = useMemo(() => selectAuthors(threads), [threads]);

    const candidates = useMemo(
        () => buildCandidates(peers, user.name),
        [peers, user.name],
    );
    const openCount = threads.filter((thread) => thread.status === CommentStatus.Open).length;

    useEffect(() => {
        if (!pendingNewComment) return;
        const consumed = consumePendingComment();
        if (!consumed) return;
        commentsStore.getState().createThread(consumed, '');
        setActiveComment(consumed.id);
    }, [pendingNewComment, commentsStore, consumePendingComment, setActiveComment]);

    useEffect(() => {
        if (!activeCommentId) return;
        const el = document.querySelector(`[data-thread-id="${activeCommentId}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [activeCommentId]);

    const formatRelative = useMemo(
        () => (ts: number) => formatRelativeTime(ts, i18n.language, t),
        [i18n.language, t],
    );

    const viewValue = useMemo(
        () => ({ candidates, formatRelative, editor: props.editor }),
        [candidates, formatRelative, props.editor],
    );

    const handleResolvedReopen = (id: string) => {
        commentsStore.getState().reopenThread(id);
    };
    const handleResolvedDelete = (id: string) => {
        commentsStore.getState().removeThread(id);
        if (props.editor) props.editor.chain().focus().unsetComment(id).run();
        if (sessionStore.getState().activeCommentId === id) {
            setActiveComment(null);
            commentsStore.getState().cancelEdit();
        }
    };

    const showResolved = filter.status !== CommentStatusFilter.Open && resolved.length > 0;
    const showOpen = filter.status !== CommentStatusFilter.Resolved;
    const openIds = useMemo(() => open.map((t) => t.id), [open]);
    const resolvedIds = useMemo(() => resolved.map((t) => t.id), [resolved]);

    return (
        <CommentsViewProvider value={viewValue}>
            <div className={`sidebar comments-sidebar${activeCommentId ? ' has-active' : ''}`}>
                <div className="comments-header">
                    <span className="sidebar-title sidebar-title-inline">
                        {t('comments.tabs.comments')}{' '}
                        <span className="comment-count-pill">{openCount}</span>
                    </span>
                </div>
                <CommentFilters totalOpen={openCount} allAuthors={allAuthors} />
                {visible.length === 0 ? (
                    <div className="sidebar-empty">
                        {threads.length === 0 ? t('comments.empty') : t('comments.noMatch')}
                    </div>
                ) : null}
                {showOpen ? (
                    <OpenCommentList threadIds={openIds} />
                ) : null}
                {showResolved ? (
                    <ResolvedCommentList
                        threadIds={resolvedIds}
                        canDelete={perms.canResolveComment}
                        onReopen={handleResolvedReopen}
                        onDelete={handleResolvedDelete}
                    />
                ) : null}
            </div>
        </CommentsViewProvider>
    );
}
