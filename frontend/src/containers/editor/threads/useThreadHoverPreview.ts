import { useCallback, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { setThreadHoverRange } from '@/editor/tiptap/extensions/ThreadHoverHighlight';

interface DocRange { from: number; to: number }

const HOVER_DELAY_MS = 80;

function setRange(editor: Editor | null, range: DocRange | null) {
    if (!editor) return;
    const view = editor.view;
    if (!view) return;
    view.dispatch(setThreadHoverRange(view.state.tr, range));
}

/**
 * Returns onMouseEnter / onMouseLeave handlers that highlight the thread's
 * doc range while hovered. Range updates are debounced so quick scrolls past
 * the rail don't churn the editor decoration set.
 */
export function useThreadHoverPreview(editor: Editor | null, range: DocRange) {
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isHoveringRef = useRef(false);

    const onMouseEnter = useCallback(() => {
        isHoveringRef.current = true;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            if (isHoveringRef.current) setRange(editor, range);
        }, HOVER_DELAY_MS);
    }, [editor, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps

    const onMouseLeave = useCallback(() => {
        isHoveringRef.current = false;
        if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
        }
        setRange(editor, null);
    }, [editor]);

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
        setRange(editor, null);
    }, [editor]);

    return { onMouseEnter, onMouseLeave };
}
