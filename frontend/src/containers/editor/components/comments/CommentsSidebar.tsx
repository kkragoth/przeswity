import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
import * as Y from 'yjs';

import { useThreads } from '@/editor/comments/useThreads';
import { CommentStatus } from '@/editor/comments/types';
import { ROLE_PERMISSIONS, type User } from '@/editor/identity/types';
import type { Peer } from '@/containers/editor/hooks/usePeers';
import { buildCandidates } from '@/containers/editor/components/comments/MentionTextarea';
import { CommentFilters } from '@/containers/editor/components/comments/CommentFilters';
import { OpenCommentList } from '@/containers/editor/components/comments/OpenCommentList';
import { ResolvedCommentList } from '@/containers/editor/components/comments/ResolvedCommentList';
import { useCommentDrafts } from '@/containers/editor/hooks/useCommentDrafts';
import { useCommentOps } from '@/containers/editor/hooks/useCommentOps';
import { useCommentThreads, CommentStatusFilter } from '@/containers/editor/hooks/useCommentThreads';
import { useCommentCallbacks } from '@/containers/editor/hooks/useCommentCallbacks';

interface CommentsSidebarProps {
    doc: Y.Doc;
    editor: Editor | null;
    user: User;
    peers: Peer[];
    activeCommentId: string | null;
    onActiveCommentChange: (id: string | null) => void;
    pendingNew: { id: string; quote: string } | null;
    onPendingHandled: () => void;
}

export function CommentsSidebar(props: CommentsSidebarProps) {
    const { t } = useTranslation('editor');
    const threads = useThreads(props.doc);
    const ops = useCommentOps(props.doc, props.user);
    const { visible, open, resolved, filter, setStatus, setAuthor, setRole, allAuthors } = useCommentThreads(threads, props.user);
    const drafts = useCommentDrafts();
    const cardsRef = useRef<Record<string, HTMLDivElement | null>>({});

    const candidates = useMemo(
        () => buildCandidates(props.peers, props.user.name),
        [props.peers, props.user.name],
    );
    const perms = ROLE_PERMISSIONS[props.user.role];
    const openCount = threads.filter((thread) => thread.status === CommentStatus.Open).length;
    const threadIds = threads.map((th) => th.id).join(',');

    useEffect(() => {
        if (!props.pendingNew) return;
        ops.createThread(props.pendingNew, '');
        props.onActiveCommentChange(props.pendingNew.id);
        props.onPendingHandled();
    }, [props.pendingNew, ops, props]);

    useEffect(() => {
        if (!props.activeCommentId) return;
        const el = cardsRef.current[props.activeCommentId];
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [props.activeCommentId]);

    const { callbacksMap, handleClose } = useCommentCallbacks({
        threads,
        threadIds,
        ops,
        drafts,
        editor: props.editor,
        activeCommentId: props.activeCommentId,
        onActiveCommentChange: props.onActiveCommentChange,
    });

    const showResolved = filter.status !== CommentStatusFilter.Open && resolved.length > 0;
    const showOpen = filter.status !== CommentStatusFilter.Resolved;

    return (
        <div className={`sidebar comments-sidebar${props.activeCommentId ? ' has-active' : ''}`}>
            <div className="comments-header">
                <span className="sidebar-title sidebar-title-inline">
                    {t('comments.tabs.comments')}{' '}
                    <span className="comment-count-pill">{openCount}</span>
                </span>
            </div>
            <CommentFilters
                filter={filter}
                setStatus={setStatus}
                setAuthor={setAuthor}
                setRole={setRole}
                totalOpen={openCount}
                allAuthors={allAuthors}
            />
            {visible.length === 0 ? (
                <div className="sidebar-empty">
                    {threads.length === 0 ? t('comments.empty') : t('comments.noMatch')}
                </div>
            ) : null}
            {showOpen ? (
                <OpenCommentList
                    threads={open}
                    activeCommentId={props.activeCommentId}
                    callbacksMap={callbacksMap}
                    cardsRef={cardsRef}
                    canResolve={perms.canResolveComment}
                    canComment={perms.canComment}
                    currentUserId={props.user.id}
                    candidates={candidates}
                    initialDraft={drafts.draft}
                    onInitialDraftChange={drafts.setDraft}
                    replyDrafts={drafts.replyDrafts}
                    onReplyDraftChange={(id, v) => drafts.setReplyDraft(id, v)}
                    editTarget={drafts.editTarget}
                    editText={drafts.editText}
                    onEditTextChange={drafts.setEditText}
                />
            ) : null}
            {showResolved ? (
                <ResolvedCommentList
                    threads={resolved}
                    canDelete={perms.canResolveComment}
                    onReopen={(id) => ops.reopen(id)}
                    onDelete={(id) => {
                        ops.remove(id);
                        if (props.editor) props.editor.chain().focus().unsetComment(id).run();
                        if (props.activeCommentId === id) handleClose();
                    }}
                />
            ) : null}
        </div>
    );
}
