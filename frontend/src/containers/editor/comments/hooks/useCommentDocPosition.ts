import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';

interface DocRange { from: number; to: number }

const EMPTY_RANGE: DocRange = { from: 0, to: 0 };

function findCommentRange(editor: Editor, commentId: string): DocRange {
    let from = -1;
    let to = -1;
    editor.state.doc.descendants((node, pos) => {
        for (const mark of node.marks) {
            if (mark.type.name !== 'comment') continue;
            if (mark.attrs.commentId !== commentId) continue;
            const start = pos;
            const end = pos + node.nodeSize;
            if (from === -1 || start < from) from = start;
            if (end > to) to = end;
        }
    });
    if (from === -1) return EMPTY_RANGE;
    return { from, to };
}

/**
 * Returns the [from,to] doc-position range covering all text marked with the
 * given comment id. Recomputes on editor `update` so anchors track live edits.
 */
export function useCommentDocPosition(editor: Editor | null, commentId: string): DocRange {
    const [range, setRange] = useState<DocRange>(EMPTY_RANGE);

    useEffect(() => {
        if (!editor) {
            setRange(EMPTY_RANGE);
            return;
        }
        const refresh = () => setRange(findCommentRange(editor, commentId));
        refresh();
        editor.on('update', refresh);
        return () => { editor.off('update', refresh); };
    }, [editor, commentId]);

    return range;
}
