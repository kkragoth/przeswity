import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import * as Y from 'yjs';
import { CommentStatus, type CommentThread } from '@/editor/comments/types';
import { SuggestionType } from '@/editor/suggestions/suggestionOps';

export function useOpenCommentsCount(doc: Y.Doc): number {
    const [count, setCount] = useState(0);
    useEffect(() => {
        const map = doc.getMap('comments') as Y.Map<CommentThread>;
        const update = () => {
            let n = 0;
            map.forEach((t) => { if (t.status === CommentStatus.Open) n += 1; });
            setCount(n);
        };
        update();
        map.observeDeep(update);
        return () => map.unobserveDeep(update);
    }, [doc]);
    return count;
}

export function useSuggestionsCount(editor: Editor | null): number {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!editor) { setCount(0); return; }
        const update = () => {
            const ids = new Set<string>();
            editor.state.doc.descendants((node) => {
                if (!node.isText) return;
                for (const mark of node.marks) {
                    if (mark.type.name === SuggestionType.Insertion || mark.type.name === SuggestionType.Deletion) {
                        const id = mark.attrs.suggestionId as string | undefined;
                        if (id) ids.add(id);
                    }
                }
            });
            setCount(ids.size);
        };
        update();
        editor.on('update', update);
        editor.on('transaction', update);
        return () => {
            editor.off('update', update);
            editor.off('transaction', update);
        };
    }, [editor]);
    return count;
}
