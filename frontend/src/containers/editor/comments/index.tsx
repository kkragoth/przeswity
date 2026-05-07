import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
import { shallow } from 'zustand/shallow';

import { useCommentThreads } from '@/editor/comments/useCommentThreads';
import { CommentStatus } from '@/editor/comments/types';
import { buildCandidates } from '@/editor/comments/mentionCandidates';
import { CommentsSidebarHeader } from './components/CommentsSidebarHeader';
import { OpenCommentList } from './components/OpenCommentList';
import { ResolvedCommentList } from './components/ResolvedCommentList';
import { OrphanedCommentList } from './components/OrphanedCommentList';
import { CommentsViewProvider } from './components/CommentsViewContext';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useEditorLive } from '@/containers/editor/session/LiveProvider';
import { useBookContext } from '@/hooks/api/useBookContext';
import { useSession, useSessionStore } from '@/containers/editor/SessionStoreProvider';
import {
    useComments,
    useCommentsStore,
} from './store/CommentsStoreProvider';
import {
    selectParticipants,
    selectFilter,
    selectOpenResolved,
    selectVisible,
} from './store/commentsSelectors';
import { CommentStatusFilter } from './store/commentsStore';
import { formatRelativeTime } from '@/lib/dates';

interface CommentsSidebarProps {
    editor: Editor | null;
}

export function CommentsSidebar(props: CommentsSidebarProps) {
    const { t, i18n } = useTranslation('editor');
    const { user, perms, collab, bookId } = useEditorSession();
    const peers = useEditorLive((s) => s.peers);
    const { assignments } = useBookContext(bookId);
    const activeCommentId = useSession((s) => s.activeCommentId);
    const pendingNewComment = useSession((s) => s.pendingNewComment);
    const setActiveComment = useSession((s) => s.setActiveComment);
    const consumePendingComment = useSession((s) => s.consumePendingComment);
    const pendingReattachId = useSession((s) => s.pendingReattachId);
    const setPendingReattach = useSession((s) => s.setPendingReattach);
    const sessionStore = useSessionStore();
    const commentsStore = useCommentsStore();
    const filter = useComments(selectFilter, shallow);
    const doc = collab.doc;
    const threads = useCommentThreads(doc);

    const visible = useMemo(() => selectVisible(threads, filter, user), [threads, filter, user]);
    const { open, resolved, orphaned } = useMemo(() => selectOpenResolved(visible), [visible]);
    const participants = useMemo(() => selectParticipants(threads), [threads]);

    const candidates = useMemo(
        () => buildCandidates({
            peers,
            assignees: assignments.map((a) => ({ name: a.user.name })),
            selfName: user.name,
        }),
        [peers, assignments, user.name],
    );
    const openCount = threads.filter((thread) => thread.status === CommentStatus.Open).length;

    const [hasSelection, setHasSelection] = useState(false);
    useEffect(() => {
        if (!props.editor || !pendingReattachId) { setHasSelection(false); return; }
        const update = () => {
            const { from, to } = props.editor!.state.selection;
            setHasSelection(from !== to);
        };
        props.editor.on('selectionUpdate', update);
        return () => { props.editor!.off('selectionUpdate', update); };
    }, [props.editor, pendingReattachId]);

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

    const handleOrphanDismiss = (id: string) => {
        commentsStore.getState().removeThread(id);
        if (props.editor) props.editor.chain().focus().unsetComment(id).run();
        if (sessionStore.getState().activeCommentId === id) {
            setActiveComment(null);
            commentsStore.getState().cancelEdit();
        }
        if (pendingReattachId === id) setPendingReattach(null);
    };

    const handleOrphanReattach = (id: string) => {
        if (pendingReattachId === id && hasSelection) {
            props.editor?.commands.setComment(id);
            commentsStore.getState().reattachThread(id);
            setPendingReattach(null);
        } else {
            setPendingReattach(id);
            props.editor?.commands.focus();
        }
    };

    const showResolved = filter.status !== CommentStatusFilter.Open && resolved.length > 0;
    const showOpen = filter.status !== CommentStatusFilter.Resolved && filter.status !== CommentStatusFilter.Orphan;
    const showOrphaned = filter.status !== CommentStatusFilter.Open
        && filter.status !== CommentStatusFilter.Resolved
        && orphaned.length > 0;
    const openIds = useMemo(() => open.map((t) => t.id), [open]);
    const resolvedIds = useMemo(() => resolved.map((t) => t.id), [resolved]);
    const orphanedIds = useMemo(() => orphaned.map((t) => t.id), [orphaned]);

    return (
        <CommentsViewProvider value={viewValue}>
            <div className={`sidebar comments-sidebar${activeCommentId ? ' has-active' : ''}`}>
                <CommentsSidebarHeader openCount={openCount} participants={participants} />
                {pendingReattachId ? (
                    <div className="reattach-banner">
                        <span>{t('comments.reattachBanner')}</span>
                        <button type="button" onClick={() => setPendingReattach(null)}>
                            {t('comments.cancelReattach')}
                        </button>
                    </div>
                ) : null}
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
                {showOrphaned ? (
                    <OrphanedCommentList
                        threadIds={orphanedIds}
                        canDelete={perms.canResolveComment}
                        pendingReattachId={pendingReattachId}
                        canConfirmReattach={hasSelection}
                        onDismiss={handleOrphanDismiss}
                        onReattach={handleOrphanReattach}
                    />
                ) : null}
            </div>
        </CommentsViewProvider>
    );
}
