import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '@/lib/dates';
import type { Editor } from '@tiptap/react';
import * as Y from 'yjs';

import { useThreads } from '@/editor/comments/useThreads';
import { ROLE_PERMISSIONS, type User } from '@/editor/identity/types';
import type { Peer } from '@/containers/editor/hooks/usePeers';
import { buildCandidates } from '@/containers/editor/components/comments/MentionTextarea';
import { CommentFilters } from '@/containers/editor/components/comments/CommentFilters';
import { CommentThreadCard, type ThreadCallbacks } from '@/containers/editor/components/comments/CommentThreadCard';
import { ResolvedThreadCard } from '@/containers/editor/components/comments/ResolvedThreadCard';
import { useCommentDrafts } from '@/containers/editor/hooks/useCommentDrafts';
import { useCommentOps } from '@/containers/editor/hooks/useCommentOps';
import { useCommentThreads, CommentStatusFilter } from '@/containers/editor/hooks/useCommentThreads';
import { useStableCallback } from '@/utils/react/useStableCallback';

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
    const { t, i18n } = useTranslation('editor');
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
    const openCount = threads.filter((thread) => thread.status === 'open').length;

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

    const handleClose = useStableCallback(() => {
        props.onActiveCommentChange(null);
        drafts.cancelEdit();
    });
    const handleEditCancel = useStableCallback(() => drafts.cancelEdit());
    const handleEditSubmit = useStableCallback(() => {
        if (!drafts.editTarget || !drafts.editText.trim()) return;
        if (drafts.editTarget.kind === 'thread') {
            ops.editThread(drafts.editTarget.threadId, drafts.editText);
        } else {
            ops.editReply(drafts.editTarget.threadId, drafts.editTarget.replyId, drafts.editText);
        }
        drafts.cancelEdit();
    });
    const handleSelect = useStableCallback((id: string) => {
        props.onActiveCommentChange(id);
        drafts.cancelEdit();
    });
    const handleResolve = useStableCallback((id: string) => {
        ops.resolve(id);
        if (props.editor) props.editor.chain().focus().unsetComment(id).run();
        handleClose();
    });
    const handleRemove = useStableCallback((id: string) => {
        ops.remove(id);
        if (props.editor) props.editor.chain().focus().unsetComment(id).run();
        if (props.activeCommentId === id) handleClose();
    });
    const handleSubmitBody = useStableCallback((id: string) => {
        const text = drafts.draft.trim();
        if (!text) return;
        ops.setThreadBody(id, text);
        drafts.setDraft('');
    });
    const handleSubmitReply = useStableCallback((id: string) => {
        const text = (drafts.replyDrafts[id] ?? '').trim();
        if (!text) return;
        ops.addReply(id, text);
        drafts.clearReplyDraft(id);
    });
    const handleEditThreadStart = useStableCallback((id: string) => {
        const thread = threads.find((th) => th.id === id);
        if (thread) drafts.beginEdit({ kind: 'thread', threadId: id }, thread.body);
    });
    const handleEditReplyStart = useStableCallback((id: string, replyId: string) => {
        const thread = threads.find((th) => th.id === id);
        const reply = thread?.replies.find((r) => r.id === replyId);
        if (reply) drafts.beginEdit({ kind: 'reply', threadId: id, replyId }, reply.body);
    });
    const handleToggleThreadReaction = useStableCallback((id: string, emoji: string) =>
        ops.toggleReaction({ kind: 'thread', threadId: id }, emoji),
    );
    const handleToggleReplyReaction = useStableCallback((id: string, replyId: string, emoji: string) =>
        ops.toggleReaction({ kind: 'reply', threadId: id, replyId }, emoji),
    );

    const threadIds = threads.map((t) => t.id).join(',');
    const callbacksMap = useMemo(
        () =>
            new Map(threads.map((th) => [th.id, {
                onSelect: () => handleSelect(th.id),
                onClose: handleClose,
                onResolve: () => handleResolve(th.id),
                onRemove: () => handleRemove(th.id),
                onSubmitInitialBody: () => handleSubmitBody(th.id),
                onSubmitReply: () => handleSubmitReply(th.id),
                onEditThreadStart: () => handleEditThreadStart(th.id),
                onEditReplyStart: (replyId: string) => handleEditReplyStart(th.id, replyId),
                onEditCancel: handleEditCancel,
                onEditSubmit: handleEditSubmit,
                onToggleThreadReaction: (emoji: string) => handleToggleThreadReaction(th.id, emoji),
                onToggleReplyReaction: (replyId: string, emoji: string) => handleToggleReplyReaction(th.id, replyId, emoji),
            } satisfies ThreadCallbacks])),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [threadIds],
    );

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
            {showOpen
                ? open.map((thread) => (
                    <div
                        key={thread.id}
                        ref={(el) => {
                            cardsRef.current[thread.id] = el;
                        }}
                    >
                        <CommentThreadCard
                            thread={thread}
                            isActive={thread.id === props.activeCommentId}
                            timeLabel={formatRelativeTime(thread.createdAt, i18n.language, t)}
                            replyTimeLabel={(ts) => formatRelativeTime(ts, i18n.language, t)}
                            canResolve={perms.canResolveComment}
                            canComment={perms.canComment}
                            currentUserId={props.user.id}
                            candidates={candidates}
                            initialDraft={drafts.draft}
                            onInitialDraftChange={drafts.setDraft}
                            replyDraft={drafts.replyDrafts[thread.id] ?? ''}
                            onReplyDraftChange={(v) => drafts.setReplyDraft(thread.id, v)}
                            editTarget={drafts.editTarget}
                            editText={drafts.editText}
                            onEditTextChange={drafts.setEditText}
                            callbacks={callbacksMap.get(thread.id)!}
                        />
                    </div>
                ))
                : null}
            {showResolved ? (
                <>
                    <div className="sidebar-title sidebar-title-resolved">
                        {t('comments.filter.resolved')} ({resolved.length})
                    </div>
                    {resolved.map((thread) => (
                        <ResolvedThreadCard
                            key={thread.id}
                            thread={thread}
                            timeLabel={thread.resolvedAt ? formatRelativeTime(thread.resolvedAt, i18n.language, t) : ''}
                            canDelete={perms.canResolveComment}
                            onReopen={() => ops.reopen(thread.id)}
                            onDelete={() => handleRemove(thread.id)}
                        />
                    ))}
                </>
            ) : null}
        </div>
    );
}
