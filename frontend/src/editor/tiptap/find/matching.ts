import type { Node as PMNode } from '@tiptap/pm/model';
import type { Match } from '@/editor/tiptap/find/state';

/**
 * Finds all text occurrences of `query` in `doc`, returning their absolute positions.
 * Returns an empty array for empty queries.
 */
export function computeMatches(doc: PMNode, query: string, caseSensitive: boolean): Match[] {
    if (!query) return [];
    const matches: Match[] = [];
    doc.descendants((node, pos) => {
        if (!node.isText) return;
        const text = node.text ?? '';
        const haystack = caseSensitive ? text : text.toLowerCase();
        const needle = caseSensitive ? query : query.toLowerCase();
        if (!needle) return;
        let idx = 0;
        while (true) {
            const found = haystack.indexOf(needle, idx);
            if (found === -1) break;
            matches.push({ from: pos + found, to: pos + found + needle.length });
            idx = found + needle.length;
        }
    });
    return matches;
}
