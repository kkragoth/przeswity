import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import type { CommentThread } from './types';

export function useCommentThreads(doc: Y.Doc): CommentThread[] {
    const [threads, setThreads] = useState<CommentThread[]>([]);
    useEffect(() => {
        const map = doc.getMap('comments') as Y.Map<CommentThread>;
        const update = () => {
            const out: CommentThread[] = [];
            map.forEach((t) => out.push(t));
            out.sort((a, b) => a.createdAt - b.createdAt);
            setThreads(out);
        };
        update();
        map.observeDeep(update);
        return () => map.unobserveDeep(update);
    }, [doc]);
    return threads;
}
