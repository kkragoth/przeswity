import { useMemo } from 'react';
import type { Editor } from '@tiptap/react';
import * as Y from 'yjs';
import { useTranslation } from 'react-i18next';
import { useCommentThreads } from '@/editor/comments/useCommentThreads';
import { CommentStatus } from '@/editor/comments/types';
import { authorColor } from '@/editor/comments/authorColor';
import { Avatar } from '@/editor/shell/Avatar';
import { useCommentPinPositions, type OpenThread } from './hooks/useCommentPinPositions';

interface CommentAnchorsProps {
    editor: Editor | null;
    doc: Y.Doc;
    activeCommentId: string | null;
    onSelect: (id: string) => void;
}

function threadChangeKey(threads: ReturnType<typeof useCommentThreads>): string {
    return threads.map((t) => `${t.id}:${t.status}:${t.replies.length}`).join(',');
}

export function CommentAnchors({ editor, doc, activeCommentId, onSelect }: CommentAnchorsProps) {
    const { t } = useTranslation('editor');
    const threads = useCommentThreads(doc);

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

    const pins = useCommentPinPositions(editor, openThreads);

    if (!editor || pins.length === 0) return null;

    return (
        <div className="comment-pins" aria-hidden={false}>
            {pins.map((p) => (
                <button
                    type="button"
                    key={p.id}
                    className={`comment-pin${activeCommentId === p.id ? ' is-active' : ''}`}
                    style={{ top: p.top }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect(p.id);
                    }}
                    title={`${p.authorName}${p.replies > 0 ? ` · ${t('comments.repliesCount', { count: p.replies })}` : ''}`}
                >
                    <Avatar
                        name={p.authorName}
                        color={p.authorColor}
                        size="sm"
                        ring={activeCommentId === p.id}
                        badge={p.replies > 0 ? p.replies : undefined}
                    />
                </button>
            ))}
        </div>
    );
}
