import { useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import * as Y from 'yjs';
import { useTranslation } from 'react-i18next';
import { useThreads } from '@/editor/comments/useThreads';
import { CommentStatus } from '@/editor/comments/types';
import { authorColor } from '@/editor/comments/color';
import { Avatar } from '@/editor/shell/Avatar';
import { COMMENT_PIN_GAP_PX } from '@/editor/constants';

interface CommentAnchorsProps {
    editor: Editor | null;
    doc: Y.Doc;
    activeCommentId: string | null;
    onSelect: (id: string) => void;
}

interface PinAnchor {
    id: string;
    top: number;
    authorName: string;
    authorColor: string;
    replies: number;
}

interface OpenThread {
    id: string;
    authorName: string;
    authorColor: string;
    replies: number;
}

function threadChangeKey(threads: ReturnType<typeof useThreads>): string {
    return threads.map((t) => `${t.id}:${t.status}:${t.replies.length}`).join(',');
}

export function CommentAnchors({ editor, doc, activeCommentId, onSelect }: CommentAnchorsProps) {
    const { t } = useTranslation('editor');
    const threads = useThreads(doc);
    const [pins, setPins] = useState<PinAnchor[]>([]);

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

    useEffect(() => {
        if (!editor) return;
        let raf = 0;
        const compute = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const dom = editor.view.dom as HTMLElement;
                const page = dom.closest('.editor-page') as HTMLElement | null;
                if (!page) return;
                const pageRect = page.getBoundingClientRect();
                const placed: PinAnchor[] = [];
                const seen = new Set<string>();
                for (const th of openThreads) {
                    if (seen.has(th.id)) continue;
                    const span = dom.querySelector(
                        `[data-comment-id="${CSS.escape(th.id)}"]`,
                    ) as HTMLElement | null;
                    if (!span) continue;
                    seen.add(th.id);
                    const r = span.getBoundingClientRect();
                    placed.push({ ...th, top: r.top - pageRect.top });
                }
                placed.sort((a, b) => a.top - b.top);
                for (let i = 1; i < placed.length; i++) {
                    if (placed[i].top - placed[i - 1].top < COMMENT_PIN_GAP_PX) {
                        placed[i].top = placed[i - 1].top + COMMENT_PIN_GAP_PX;
                    }
                }
                setPins(placed);
            });
        };
        compute();
        const onTr = () => compute();
        editor.on('transaction', onTr);
        window.addEventListener('resize', compute);
        return () => {
            cancelAnimationFrame(raf);
            editor.off('transaction', onTr);
            window.removeEventListener('resize', compute);
        };
    }, [editor, openThreads]);

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
