import { Node, type Schema } from 'prosemirror-model';
import { StepMap, Transform } from 'prosemirror-transform';
import { ChangeSet } from 'prosemirror-changeset';

import type { JSONNode } from '@/editor/types';
import { DIFF_BLOCK_TYPES } from '@/editor/suggestions/DiffBlockAttr';
export type { JSONNode } from '@/editor/types';

const BLOCK_TYPES = new Set<string>(DIFF_BLOCK_TYPES);

const DIFF_AUTHOR_NEWER = { id: 'diff', name: 'newer', color: '#15803d' };
const DIFF_AUTHOR_OLDER = { id: 'diff', name: 'older', color: '#9ca3af' };

function trackMark(schema: Schema, kind: 'insertion' | 'deletion') {
    const type = schema.marks[kind];
    if (!type) return null;
    const author = kind === 'insertion' ? DIFF_AUTHOR_NEWER : DIFF_AUTHOR_OLDER;
    return type.create({
        suggestionId: 'diff',
        authorId: author.id,
        authorName: author.name,
        authorColor: author.color,
        timestamp: 0,
    });
}

/**
 * Build an inline diff doc by computing a ProseMirror changeset between two
 * snapshots and folding both insertions (marked) and the deleted slices
 * (re-inserted with the deletion mark) into one document.
 *
 * Reverse-iterating the changes keeps positions stable: each transform step
 * only shifts positions ≥ its insertion point, and earlier changes have
 * smaller positions that aren't touched by the later ones we already applied.
 */
export function buildDiffDoc(schema: Schema, a: JSONNode, b: JSONNode): JSONNode {
    const oldDoc = Node.fromJSON(schema, a);
    const newDoc = Node.fromJSON(schema, b);

    const stepMap = new StepMap([0, oldDoc.content.size, newDoc.content.size]);
    const cs = ChangeSet.create(oldDoc).addSteps(newDoc, [stepMap], null);

    const insMark = trackMark(schema, 'insertion');
    const delMark = trackMark(schema, 'deletion');
    if (!insMark || !delMark) return b;

    const out = new Transform(newDoc);
    for (let i = cs.changes.length - 1; i >= 0; i--) {
        const change = cs.changes[i];
        if (change.fromB < change.toB) {
            out.addMark(change.fromB, change.toB, insMark);
        }
        if (change.fromA < change.toA) {
            try {
                const slice = oldDoc.slice(change.fromA, change.toA);
                const before = out.doc.content.size;
                out.replace(change.fromB, change.fromB, slice);
                const inserted = out.doc.content.size - before;
                if (inserted > 0) {
                    out.addMark(change.fromB, change.fromB + inserted, delMark);
                }
            } catch (err) {
                console.warn('buildDiffDoc: could not inline deleted slice', err);
            }
        }
    }

    const json = out.doc.toJSON() as JSONNode;
    annotateWhollyChangedBlocks(json);
    return json;
}

type BlockKind = 'ins' | 'del' | 'mixed' | 'none';

/** Returns the single mark kind covering all text descendants of this node, or
 *  'mixed' (multiple kinds present) / 'none' (no track-change marks at all). */
function blockChangeKind(node: JSONNode): BlockKind {
    const samples: BlockKind[] = [];
    const visit = (n: JSONNode) => {
        if (n.type === 'text') {
            const marks = n.marks ?? [];
            const hasIns = marks.some((m) => m.type === 'insertion');
            const hasDel = marks.some((m) => m.type === 'deletion');
            if (hasIns && hasDel) samples.push('mixed');
            else if (hasIns) samples.push('ins');
            else if (hasDel) samples.push('del');
            else if ((n.text ?? '').trim() !== '') samples.push('mixed');
            return;
        }
        (n.content ?? []).forEach(visit);
    };
    visit(node);
    if (samples.length === 0) return 'none';
    const first = samples[0];
    return samples.every((s) => s === first) ? first : 'mixed';
}

function annotateWhollyChangedBlocks(node: JSONNode): void {
    if (BLOCK_TYPES.has(node.type)) {
        const kind = blockChangeKind(node);
        if (kind === 'ins' || kind === 'del') {
            node.attrs = { ...(node.attrs ?? {}), diffBlock: kind };
        }
    }
    (node.content ?? []).forEach(annotateWhollyChangedBlocks);
}

export function diffStats(diff: JSONNode): { ins: number; del: number } {
    let ins = 0;
    let del = 0;
    const visit = (n: JSONNode) => {
        if (n.type === 'text') {
            const len = (n.text ?? '').length;
            const marks = n.marks ?? [];
            if (marks.some((m) => m.type === 'insertion')) ins += len;
            if (marks.some((m) => m.type === 'deletion')) del += len;
        }
        ;(n.content ?? []).forEach(visit);
    };
    visit(diff);
    return { ins, del };
}
