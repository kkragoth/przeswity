import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { isChangeOrigin } from '@tiptap/extension-collaboration';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import { ReplaceStep, ReplaceAroundStep, AddMarkStep, RemoveMarkStep, AttrStep } from '@tiptap/pm/transform';
import type { Mark, MarkType, Node as PmNode, Slice } from '@tiptap/pm/model';
import { backspaceInSuggestingMode, forwardDeleteInSuggestingMode } from '@/editor/suggestions/suggestionKeyHandlers';
import { applyMarkToSlice, attrsForAuthoredMark, attrsForAuthoredMarkWithPair, stripInsertionFlood, makeMarkAttrs } from '@/editor/suggestions/suggestionMarkUtils';

export interface SuggestionAuthor {
  id: string
  name: string
  color: string
}

export interface SuggestionModeOptions {
  getEnabled: () => boolean
  getAuthor: () => SuggestionAuthor | null
}

const META_SKIP = 'suggestionMode/skip';

// Whitelisted node attributes whose changes are tracked as format suggestions.
const TRACKED_NODE_ATTRS = new Set(['level', 'listType', 'type']);

function isHistoryTransaction(tx: Transaction): boolean {
    const meta = (tx as unknown as { meta: Record<string, unknown> | null }).meta;
    if (!meta) return false;
    // ProseMirror history sets meta with { redo: boolean, historyState: ... }
    return Object.values(meta).some(
        (v) => v !== null && typeof v === 'object' && 'redo' in (v as object) && 'historyState' in (v as object),
    );
}

function isUndoRedoBatch(transactions: readonly Transaction[]): boolean {
    return transactions.some(isHistoryTransaction);
}

function resolveRemovedSlice(tx: Transaction, stepIndex: number, from: number, to: number): Slice | null {
    if (to <= from) return null;
    const doc = (tx as unknown as { docs: PmNode[] }).docs[stepIndex];
    return doc ? doc.slice(from, to) : null;
}

function mapThroughLaterSteps(pos: number, bias: 1 | -1, tx: Transaction, fromStepIndex: number): number {
    for (let j = fromStepIndex; j < tx.steps.length; j++) {
        pos = tx.steps[j].getMap().map(pos, bias);
    }
    return pos;
}

function mapThroughLaterTxs(pos: number, bias: 1 | -1, transactions: readonly Transaction[], fromTxIndex: number): number {
    for (let j = fromTxIndex; j < transactions.length; j++) {
        pos = transactions[j].mapping.map(pos, bias);
    }
    return pos;
}

export const SuggestionMode = Extension.create<SuggestionModeOptions>({
    name: 'suggestionMode',
    addOptions() {
        return { getEnabled: () => false, getAuthor: () => null };
    },
    addKeyboardShortcuts() {
        return {
            Backspace: ({ editor }) => backspaceInSuggestingMode(editor as Editor, this.options),
            Delete: ({ editor }) => forwardDeleteInSuggestingMode(editor as Editor, this.options),
        };
    },
    addProseMirrorPlugins() {
        const opts = this.options;
        return [new Plugin({
            key: new PluginKey('suggestionMode-marker'),
            appendTransaction(transactions, oldState, newState) {
                const author = opts.getAuthor();
                if (!author) return null;
                if (transactions.some((t) => t.getMeta(META_SKIP))) return null;
                if (!transactions.some((t) => t.docChanged)) return null;

                const { insertion: insertionType, deletion: deletionType, formatChange: formatChangeType } =
                    newState.schema.marks as Record<string, MarkType | undefined>;
                if (!insertionType || !deletionType) return null;

                if (transactions.some(isChangeOrigin)) {
                    return stripInsertionFlood(newState, insertionType, author.id);
                }
                if (!opts.getEnabled()) return null;
                if (isUndoRedoBatch(transactions)) return null;

                const tr = newState.tr;
                const replaceWork: Array<{ mappedFrom: number; mappedTo: number; removedSlice: Slice | null }> = [];

                for (let txIdx = 0; txIdx < transactions.length; txIdx++) {
                    const tx = transactions[txIdx];
                    if (tx.getMeta(META_SKIP)) continue;

                    for (let i = 0; i < tx.steps.length; i++) {
                        const step = tx.steps[i];

                        if (step instanceof ReplaceStep) {
                            const removedSlice = resolveRemovedSlice(tx, i, step.from, step.to);
                            if (step.slice.size === 0 && (!removedSlice || removedSlice.size === 0)) continue;
                            let mappedFrom = mapThroughLaterSteps(step.from, 1, tx, i + 1);
                            let mappedTo = mapThroughLaterSteps(step.from + step.slice.size, -1, tx, i + 1);
                            mappedFrom = mapThroughLaterTxs(mappedFrom, 1, transactions, txIdx + 1);
                            mappedTo = mapThroughLaterTxs(mappedTo, -1, transactions, txIdx + 1);
                            replaceWork.push({ mappedFrom, mappedTo, removedSlice });
                            continue;
                        }

                        if (step instanceof ReplaceAroundStep) {
                            // Wrap/unwrap: track the wrapped content range as a format change.
                            if (!formatChangeType) continue;
                            let gapFrom = mapThroughLaterTxs(step.gapFrom, 1, transactions, txIdx + 1);
                            let gapTo = mapThroughLaterTxs(step.gapTo, -1, transactions, txIdx + 1);
                            if (gapTo > gapFrom && gapFrom >= 0) {
                                const fmtAttrs = { ...makeMarkAttrs(author), marksAdded: '[]', marksRemoved: '[]', nodeAttr: 'null' };
                                tr.addMark(gapFrom, gapTo, formatChangeType.create(fmtAttrs));
                            }
                            continue;
                        }

                        if (step instanceof AddMarkStep || step instanceof RemoveMarkStep) {
                            if (!formatChangeType) continue;
                            const isAdd = step instanceof AddMarkStep;
                            const stepMark = (step as AddMarkStep).mark ?? (step as RemoveMarkStep).mark;
                            // Skip tracking our own suggestion marks — avoids feedback loop
                            if (stepMark.type === insertionType || stepMark.type === deletionType || stepMark.type === formatChangeType) continue;

                            const rawFrom = (step as AddMarkStep).from;
                            const rawTo = (step as AddMarkStep).to;
                            let mappedFrom = mapThroughLaterTxs(rawFrom, 1, transactions, txIdx + 1);
                            let mappedTo = mapThroughLaterTxs(rawTo, -1, transactions, txIdx + 1);
                            if (mappedTo <= mappedFrom || mappedFrom < 0) continue;

                            const marksAdded = JSON.stringify(isAdd ? [stepMark.type.name] : []);
                            const marksRemoved = JSON.stringify(isAdd ? [] : [stepMark.type.name]);
                            const fmtAttrs = { ...makeMarkAttrs(author), marksAdded, marksRemoved, nodeAttr: 'null' };
                            tr.addMark(mappedFrom, mappedTo, formatChangeType.create(fmtAttrs));
                            continue;
                        }

                        if (step instanceof AttrStep) {
                            if (!formatChangeType || !TRACKED_NODE_ATTRS.has(step.attr)) continue;
                            const node = oldState.doc.nodeAt(step.pos);
                            if (!node) continue;
                            const before = node.attrs[step.attr] as unknown;
                            const nodeAttr = JSON.stringify({ attr: step.attr, before, after: step.value });

                            // AttrStep affects a node, not a text range — mark the node's content
                            let nodeFrom = mapThroughLaterTxs(step.pos + 1, 1, transactions, txIdx + 1);
                            let nodeTo = mapThroughLaterTxs(step.pos + node.nodeSize - 1, -1, transactions, txIdx + 1);
                            if (nodeTo > nodeFrom && nodeFrom >= 0) {
                                const fmtAttrs = { ...makeMarkAttrs(author), marksAdded: '[]', marksRemoved: '[]', nodeAttr };
                                tr.addMark(nodeFrom, nodeTo, formatChangeType.create(fmtAttrs));
                            }
                        }
                    }
                }

                // Apply ReplaceStep work (content tracking) from highest pos to lowest
                replaceWork.sort((a, b) => b.mappedFrom - a.mappedFrom);
                for (const w of replaceWork) {
                    const { mappedFrom, mappedTo, removedSlice } = w;
                    if (mappedFrom < 0 || mappedFrom > newState.doc.content.size) continue;
                    const hasInsertion = mappedTo > mappedFrom && mappedTo <= newState.doc.content.size;
                    const hasDeletion = !!removedSlice && removedSlice.size > 0;

                    const pairedAttrs = hasInsertion && hasDeletion
                        ? attrsForAuthoredMark(newState, insertionType, author, mappedFrom, mappedTo)
                        : null;

                    if (hasInsertion) {
                        const insAttrs = pairedAttrs
                            ?? attrsForAuthoredMarkWithPair(newState, insertionType, deletionType, author, mappedFrom, mappedTo);
                        const insMark: Mark = insertionType.create(insAttrs);
                        if (!rangeFullyHasMark(newState.doc, mappedFrom, mappedTo, insMark)) {
                            tr.addMark(mappedFrom, mappedTo, insMark);
                        }
                        tr.removeMark(mappedFrom, mappedTo, deletionType);
                    }

                    if (hasDeletion && removedSlice) {
                        const delAttrs = pairedAttrs
                            ?? attrsForAuthoredMark(newState, deletionType, author, mappedFrom, mappedFrom);
                        const markedSlice = applyMarkToSlice(removedSlice, deletionType.create(delAttrs));
                        try {
                            tr.replace(mappedFrom, mappedFrom, markedSlice);
                        } catch {
                            // Cross-block deletion collapsed to a different structure — let it stand.
                        }
                    }
                }

                if (tr.steps.length === 0) return null;
                tr.setMeta(META_SKIP, true);
                tr.setMeta('addToHistory', false);
                return tr;
            },
        })];
    },
});

function rangeFullyHasMark(doc: PmNode, from: number, to: number, mark: Mark): boolean {
    let allHave = true;
    let sawText = false;
    doc.nodesBetween(from, to, (node) => {
        if (!node.isText) return;
        sawText = true;
        if (!mark.isInSet(node.marks)) allHave = false;
    });
    return sawText && allHave;
}
