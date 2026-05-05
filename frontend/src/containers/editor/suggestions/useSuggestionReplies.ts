import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { getSuggestionReplies } from '@/editor/suggestions/suggestionReplyOps';
import type { SuggestionReply } from '@/editor/suggestions/suggestionReplyTypes';

export function useSuggestionReplies(doc: Y.Doc, suggestionId: string): SuggestionReply[] {
    const [replies, setReplies] = useState<SuggestionReply[]>(() =>
        getSuggestionReplies(doc, suggestionId),
    );

    useEffect(() => {
        const map = doc.getMap('suggestionReplies');
        const update = () => setReplies(getSuggestionReplies(doc, suggestionId));
        map.observeDeep(update);
        update();
        return () => map.unobserveDeep(update);
    }, [doc, suggestionId]);

    return replies;
}
