import { Plugin, PluginKey } from 'prosemirror-state';
import type { Transaction } from 'prosemirror-state';
import type { Node } from 'prosemirror-model';
import type * as Y from 'yjs';

export const commentOrphanWatcherKey = new PluginKey<null>('commentOrphanWatcher');

const EXPLICIT_UNSET_META = 'comment:explicit-unset';

interface Options {
    ydoc: Y.Doc;
    isLocalOrigin: (tr: Transaction) => boolean;
    markOrphan: (threadId: string, lastQuote: string) => void;
}

function collectCommentIds(doc: Node): Set<string> {
    const ids = new Set<string>();
    doc.descendants((node) => {
        for (const mark of node.marks) {
            if (mark.type.name === 'comment' && mark.attrs.commentId) {
                ids.add(String(mark.attrs.commentId));
            }
        }
    });
    return ids;
}

function extractQuote(doc: Node, commentId: string): string {
    const parts: string[] = [];
    doc.descendants((node) => {
        if (!node.isText) return;
        const hasMark = node.marks.some(
            (m) => m.type.name === 'comment' && m.attrs.commentId === commentId,
        );
        if (hasMark) parts.push(node.text ?? '');
    });
    return parts.join('').slice(0, 200);
}

export function commentOrphanWatcher(opts: Options): Plugin {
    return new Plugin({
        key: commentOrphanWatcherKey,

        appendTransaction(transactions, oldState, newState) {
            for (const tr of transactions) {
                // Skip non-local (remote) transactions — only the author's own deletions are local.
                if (!opts.isLocalOrigin(tr)) continue;
                // Skip explicit unset — those are intentional and handled separately.
                if (tr.getMeta(EXPLICIT_UNSET_META)) continue;
                // Skip transactions without doc changes.
                if (!tr.docChanged) continue;

                const before = collectCommentIds(oldState.doc);
                const after = collectCommentIds(newState.doc);

                for (const id of before) {
                    if (!after.has(id)) {
                        const quote = extractQuote(oldState.doc, id);
                        opts.markOrphan(id, quote);
                    }
                }
            }
            return null;
        },
    });
}
