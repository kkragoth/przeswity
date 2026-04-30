import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
import * as Y from 'yjs';

import { useThreads } from '@/editor/comments/useThreads';
import type { User } from '@/editor/identity/types';
import type { Peer } from '@/containers/editor/hooks/usePeers';
import { buildCandidates } from '@/containers/editor/components/comments/MentionTextarea';
import { CommentFilters } from '@/containers/editor/components/comments/CommentFilters';
import { CommentReply } from '@/containers/editor/components/comments/CommentReply';
import { CommentThreadCard } from '@/containers/editor/components/comments/CommentThreadCard';
import { CommentThreadForm } from '@/containers/editor/components/comments/CommentThreadForm';
import { useCommentDrafts } from '@/containers/editor/hooks/useCommentDrafts';
import { useCommentOps } from '@/containers/editor/hooks/useCommentOps';
import { useCommentThreads } from '@/containers/editor/hooks/useCommentThreads';

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
    const { visible, filter, setFilter } = useCommentThreads(threads, props.user);
    const drafts = useCommentDrafts();
    const candidates = useMemo(
        () => buildCandidates(props.peers, props.user.name),
        [props.peers, props.user.name],
    );
    const openCount = threads.filter((thread) => thread.status === 'open').length;
    const active = visible.find((thread) => thread.id === props.activeCommentId) ?? null;

    const selectThread = (id: string) => {
        props.onActiveCommentChange(id);
        drafts.cancelEdit();
    };

    const postThread = () => {
        if (!props.pendingNew || !drafts.draft.trim()) return;
        const threadId = ops.createThread(props.pendingNew, drafts.draft);
        drafts.setDraft('');
        props.onPendingHandled();
        props.onActiveCommentChange(threadId);
    };

    const postReply = () => {
        if (!active) return;
        const body = drafts.replyDrafts[active.id] ?? '';
        if (!body.trim()) return;
        ops.addReply(active.id, body);
        drafts.clearReplyDraft(active.id);
    };

    const submitEdit = () => {
        if (!drafts.editBuffer || drafts.editBuffer.kind !== 'reply' || !drafts.draft.trim()) return;
        ops.editReply(drafts.editBuffer.threadId, drafts.editBuffer.replyId, drafts.draft);
        drafts.setDraft('');
        drafts.cancelEdit();
    };

    return (
        <section className="comments-sidebar">
            <CommentFilters filter={filter} setFilter={setFilter} totalOpen={openCount} />
            {!props.pendingNew && visible.length === 0 ? (
                <div className="comments-empty">{t(filter === 'open' ? 'comments.empty' : 'comments.noMatch')}</div>
            ) : null}

            {props.pendingNew ? (
                <CommentThreadForm
                    value={drafts.draft}
                    onChange={drafts.setDraft}
                    onSubmit={postThread}
                    candidates={candidates}
                    placeholderKey="comments.writeComment"
                />
            ) : null}

            {visible.map((thread) => (
                <article key={thread.id} className="thread-block">
                    <CommentThreadCard
                        thread={thread}
                        isActive={thread.id === props.activeCommentId}
                        timeLabel={new Date(thread.createdAt).toLocaleString(i18n.language)}
                        onSelect={() => selectThread(thread.id)}
                    />

                    {thread.id === props.activeCommentId ? (
                        <div className="thread-expanded">
                            {thread.replies.map((reply) => (
                                <CommentReply
                                    key={reply.id}
                                    reply={reply}
                                    timeLabel={new Date(reply.createdAt).toLocaleString(i18n.language)}
                                    canEdit={reply.authorId === props.user.id}
                                    onEdit={() => {
                                        drafts.beginEdit({ kind: 'reply', threadId: thread.id, replyId: reply.id });
                                        drafts.setDraft(reply.body);
                                    }}
                                    reactionsUserId={props.user.id}
                                    onToggleReaction={() => {}}
                                />
                            ))}

                            <CommentThreadForm
                                value={drafts.editBuffer ? drafts.draft : (drafts.replyDrafts[thread.id] ?? '')}
                                onChange={(value) => {
                                    if (drafts.editBuffer) drafts.setDraft(value);
                                    else drafts.setReplyDraft(thread.id, value);
                                }}
                                onSubmit={drafts.editBuffer ? submitEdit : postReply}
                                candidates={candidates}
                                placeholderKey={drafts.editBuffer ? 'comments.editReply' : 'comments.writeReply'}
                            />
                        </div>
                    ) : null}
                </article>
            ))}
        </section>
    );
}
