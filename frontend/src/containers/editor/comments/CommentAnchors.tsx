import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
import * as Y from 'yjs';
import { useCommentThreads } from '@/editor/comments/useCommentThreads';
import { CommentStatus } from '@/editor/comments/types';
import { authorColor } from '@/editor/comments/authorColor';
import { COMMENT_PIN_AVATAR_GAP_PX, COMMENT_PIN_CARD_GAP_PX } from '@/editor/constants';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useSession } from '@/containers/editor/SessionStoreProvider';
import { usePaneStore, PinsMode } from '@/containers/editor/session/paneStore';
import { useToast } from '@/editor/shell/useToast';
import { InlinePinCard } from './components/InlinePinCard';
import { useCommentsStore } from './store/CommentsStoreProvider';
import { useCommentPinPositions, type OpenThread } from './hooks/useCommentPinPositions';

function gapForMode(mode: PinsMode): number {
    return mode === PinsMode.Full ? COMMENT_PIN_CARD_GAP_PX : COMMENT_PIN_AVATAR_GAP_PX;
}

interface CommentAnchorsProps {
    editor: Editor | null;
    doc: Y.Doc;
    activeCommentId: string | null;
    onSelect: (id: string) => void;
}

function threadChangeKey(threads: ReturnType<typeof useCommentThreads>): string {
    return threads
        .map((t) => `${t.id}:${t.status}:${t.replies.length}:${t.edited ?? 0}:${t.body.length}`)
        .join(',');
}

export function CommentAnchors({ editor, doc, activeCommentId, onSelect }: CommentAnchorsProps) {
    const { t } = useTranslation('editor');
    const { perms } = useEditorSession();
    const threads = useCommentThreads(doc);
    const pinsMode = usePaneStore((s) => s.pinsMode);
    const pinsSide = usePaneStore((s) => s.pinsSide);
    const commentsStore = useCommentsStore();
    const setActiveComment = useSession((s) => s.setActiveComment);
    const { showWithUndo } = useToast();

    const handleResolve = useCallback((id: string) => {
        // Resolve = pure y-doc status change. We DON'T touch the editor mark,
        // so the inline pin (`openThreads` filter) is the single source of
        // truth — flipping status back via reopenThread (toast undo or any
        // other path) makes the cloud pop back instantly. The mark gets a
        // muted `.is-resolved` class via `useResolvedCommentMarkClass`.
        commentsStore.getState().resolveThread(id);
        setActiveComment(null);
        commentsStore.getState().cancelEdit();
        showWithUndo(t('comments.resolvedToast'), {
            label: t('comments.undo'),
            onUndo: () => commentsStore.getState().reopenThread(id),
        });
    }, [commentsStore, setActiveComment, showWithUndo, t]);

    const handleClose = useCallback(() => {
        setActiveComment(null);
        commentsStore.getState().cancelEdit();
    }, [setActiveComment, commentsStore]);

    const handleReply = useCallback((id: string) => {
        // Activate the thread (opens sidebar) and focus the reply textarea
        // inside it on the next paint, after layout settles.
        setActiveComment(id);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const ta = document.querySelector<HTMLTextAreaElement>(
                `[data-thread-id="${CSS.escape(id)}"] .thread-reply-compose textarea`,
            );
            ta?.focus();
        }));
    }, [setActiveComment]);

    const changeKey = threadChangeKey(threads);
    const openThreads = useMemo<OpenThread[]>(
        () => threads
            .filter((th) => th.status === CommentStatus.Open)
            .map((th) => ({
                id: th.id,
                authorName: th.authorName,
                authorColor: authorColor(th),
                replies: th.replies.length,
            })),
        [changeKey], // eslint-disable-line react-hooks/exhaustive-deps
    );

    const previewMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const th of threads) {
            if (th.body) map.set(th.id, th.body.slice(0, 80));
        }
        return map;
    }, [changeKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const pins = useCommentPinPositions(editor, openThreads, gapForMode(pinsMode));

    if (!editor || pins.length === 0 || pinsMode === PinsMode.Off) return null;

    return (
        <div
            className={`comment-pins comment-pins--${pinsMode} comment-pins--side-${pinsSide}`}
            aria-hidden={false}
        >
            {pins.map((p) => (
                <InlinePinCard
                    key={p.id}
                    pin={p}
                    isActive={activeCommentId === p.id}
                    mode={pinsMode}
                    preview={pinsMode === PinsMode.Full ? previewMap.get(p.id) : undefined}
                    onClick={onSelect}
                    onClose={handleClose}
                    onReply={handleReply}
                    onResolve={perms.canResolveComment ? handleResolve : undefined}
                />
            ))}
        </div>
    );
}
