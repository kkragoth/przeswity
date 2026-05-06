import type { JSONNode } from '@/editor/types';
import { DIFF_BLOCK_TYPES } from '@/editor/suggestions/blockDiffAttribute';

const BLOCK_TYPES = new Set<string>(DIFF_BLOCK_TYPES);

enum SideKind {
    Older = 'older',
    Newer = 'newer',
}

const dropMarkForSide = (side: SideKind) =>
    side === SideKind.Older ? 'insertion' : 'deletion';

const blockKeepKindForSide = (side: SideKind): 'ins' | 'del' =>
    side === SideKind.Older ? 'del' : 'ins';

/**
 * Returns true when the text node would be erased on this side
 * (insertion-marked text doesn't exist on the older side; deletion-marked
 * text doesn't exist on the newer side).
 */
function isTextErasedOnSide(node: JSONNode, side: SideKind): boolean {
    if (node.type !== 'text') return false;
    const dropMark = dropMarkForSide(side);
    return (node.marks ?? []).some((m) => m.type === dropMark);
}

function filterNode(node: JSONNode, side: SideKind): JSONNode | null {
    if (isTextErasedOnSide(node, side)) return null;

    const next: JSONNode = { ...node };
    if (node.content) {
        const filtered: JSONNode[] = [];
        for (const child of node.content) {
            const result = filterNode(child, side);
            if (result) filtered.push(result);
        }
        next.content = filtered;
    }

    // For wholly-changed blocks: the diffBlock attr says the entire block was
    // either inserted or deleted. Keep it on the relevant side, drop on the other.
    if (BLOCK_TYPES.has(node.type) && node.attrs?.diffBlock) {
        const diffBlock = node.attrs.diffBlock as 'ins' | 'del';
        if (diffBlock !== blockKeepKindForSide(side)) return null;
    }

    return next;
}

export interface SplitSides {
    older: JSONNode;
    newer: JSONNode;
}

/**
 * Splits a unified diff doc (built by `buildDiffDoc`) into two per-side docs.
 * Each side keeps only the marks relevant to it so the SBS view can render
 * red strike-through on the older side and green underline on the newer side
 * via the existing `.diff-page` CSS rules.
 */
export function splitDiffSides(diffJson: JSONNode): SplitSides {
    return {
        older: filterNode(diffJson, SideKind.Older) ?? diffJson,
        newer: filterNode(diffJson, SideKind.Newer) ?? diffJson,
    };
}
