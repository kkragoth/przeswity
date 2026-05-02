import { useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { HEADING_PULSE_MS } from '@/editor/constants';

const PULSE_CLASS = 'comment-pulse';

/**
 * When activeCommentId changes, scrolls the matching comment-anchor span(s)
 * into view and applies a transient pulse animation. No-op when null.
 */
export function useCommentScrollPulse(
    editor: Editor | null,
    activeCommentId: string | null,
): void {
    useEffect(() => {
        if (!editor || !activeCommentId) return;
        const dom = editor.view.dom as HTMLElement;
        const spans = dom.querySelectorAll<HTMLElement>(
            `[data-comment-id="${CSS.escape(activeCommentId)}"]`,
        );
        if (spans.length === 0) return;
        spans[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        spans.forEach((span) => {
            span.classList.remove(PULSE_CLASS);
            void span.offsetWidth; // restart the CSS animation
            span.classList.add(PULSE_CLASS);
        });
        const t = window.setTimeout(() => {
            spans.forEach((span) => span.classList.remove(PULSE_CLASS));
        }, HEADING_PULSE_MS);
        return () => {
            window.clearTimeout(t);
            spans.forEach((span) => span.classList.remove(PULSE_CLASS));
        };
    }, [editor, activeCommentId]);
}
