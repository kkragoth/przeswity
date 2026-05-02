import { useMemo } from 'react';
import type { Editor } from '@tiptap/react';
import type { CommentThread } from '@/editor/comments/types';
import type { ThreadCallbacks } from '@/containers/editor/components/comments/CommentThreadCard';
import type { useCommentOps } from '@/containers/editor/hooks/useCommentOps';
import type { useCommentDrafts } from '@/containers/editor/hooks/useCommentDrafts';
import { useStableCallback } from '@/utils/react/useStableCallback';
import { assertNever } from '@/lib/assert';

interface UseCommentCallbacksParams {
    threads: CommentThread[];
    threadIds: string;
    ops: ReturnType<typeof useCommentOps>;
    drafts: ReturnType<typeof useCommentDrafts>;
    editor: Editor | null;
    activeCommentId: string | null;
    onActiveCommentChange: (id: string | null) => void;
}

interface UseCommentCallbacksResult {
    callbacksMap: Map<string, ThreadCallbacks>;
    handleClose: () => void;
    handleEditSubmit: () => void;
}

export function useCommentCallbacks({
    threads,
    threadIds,
    ops,
    drafts,
    editor,
    activeCommentId,
    onActiveCommentChange,
}: UseCommentCallbacksParams): UseCommentCallbacksResult {
    const handleClose = useStableCallback(() => {
        onActiveCommentChange(null);
        drafts.cancelEdit();
    });
    const handleEditCancel = useStableCallback(() => drafts.cancelEdit());
    const handleEditSubmit = useStableCallback(() => {
        if (!drafts.editTarget || !drafts.editText.trim()) return;
        const target = drafts.editTarget;
        switch (target.kind) {
            case 'thread':
                ops.editThread(target.threadId, drafts.editText);
                break;
            case 'reply':
                ops.editReply(target.threadId, target.replyId, drafts.editText);
                break;
            default:
                assertNever(target);
        }
        drafts.cancelEdit();
    });
    const handleSelect = useStableCallback((id: string) => {
        onActiveCommentChange(id);
        drafts.cancelEdit();
    });
    const handleResolve = useStableCallback((id: string) => {
        ops.resolve(id);
        if (editor) editor.chain().focus().unsetComment(id).run();
        handleClose();
    });
    const handleRemove = useStableCallback((id: string) => {
        ops.remove(id);
        if (editor) editor.chain().focus().unsetComment(id).run();
        if (activeCommentId === id) handleClose();
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
        // threadIds is a stable string key derived from threads array identity
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [threadIds],
    );

    return { callbacksMap, handleClose, handleEditSubmit };
}
