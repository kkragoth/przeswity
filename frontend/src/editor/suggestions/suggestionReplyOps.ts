import * as Y from 'yjs';
import { makeId } from '@/editor/utils';
import type { SuggestionReply } from './suggestionReplyTypes';
import type { SuggestionAuthor } from './SuggestionMode';

function getReplyMap(doc: Y.Doc): Y.Map<SuggestionReply> {
    return doc.getMap('suggestionReplies') as Y.Map<SuggestionReply>;
}

export function addSuggestionReply(
    doc: Y.Doc,
    suggestionId: string,
    author: SuggestionAuthor,
    body: string,
): void {
    const id = makeId();
    const reply: SuggestionReply = {
        id,
        suggestionId,
        authorId: author.id,
        authorName: author.name,
        authorColor: author.color,
        body,
        createdAt: Date.now(),
    };
    getReplyMap(doc).set(`${suggestionId}:${id}`, reply);
}

export function deleteSuggestionReplies(doc: Y.Doc, suggestionId: string): void {
    const map = getReplyMap(doc);
    const prefix = `${suggestionId}:`;
    const keys: string[] = [];
    map.forEach((_, key) => { if (key.startsWith(prefix)) keys.push(key); });
    doc.transact(() => { keys.forEach((k) => map.delete(k)); });
}

export function getSuggestionReplies(doc: Y.Doc, suggestionId: string): SuggestionReply[] {
    const out: SuggestionReply[] = [];
    const prefix = `${suggestionId}:`;
    getReplyMap(doc).forEach((reply, key) => {
        if (key.startsWith(prefix)) out.push(reply);
    });
    out.sort((a, b) => a.createdAt - b.createdAt);
    return out;
}
