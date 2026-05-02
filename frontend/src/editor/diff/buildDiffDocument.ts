import { diffLines, diffWordsWithSpace, type Change } from 'diff';

export type LineKind = 'eq' | 'ins' | 'del';

export interface DiffLine {
    kind: LineKind;
    text: string;
    oldNo?: number;
    newNo?: number;
    spans?: { kind: LineKind; text: string }[];
}

export interface SbsRow {
    left?: DiffLine;
    right?: DiffLine;
}

export interface LineCounter { old: number; new: number }

export function splitLines(value: string): string[] {
    if (value === '') return [];
    return value.endsWith('\n') ? value.slice(0, -1).split('\n') : value.split('\n');
}

export function intraWordSpans(oldLine: string, newLine: string): { left: DiffLine['spans']; right: DiffLine['spans'] } {
    const parts = diffWordsWithSpace(oldLine, newLine);
    const left: NonNullable<DiffLine['spans']> = [];
    const right: NonNullable<DiffLine['spans']> = [];
    for (const p of parts) {
        if (p.added) right.push({ kind: 'ins', text: p.value });
        else if (p.removed) left.push({ kind: 'del', text: p.value });
        else {
            left.push({ kind: 'eq', text: p.value });
            right.push({ kind: 'eq', text: p.value });
        }
    }
    return { left, right };
}

export function pairHunks(changes: Change[]): { removed?: Change; added?: Change; eq?: Change }[] {
    const out: { removed?: Change; added?: Change; eq?: Change }[] = [];
    for (let i = 0; i < changes.length; i++) {
        const c = changes[i];
        if (c.removed && changes[i + 1]?.added) {
            out.push({ removed: c, added: changes[i + 1] });
            i++;
        } else if (c.removed) out.push({ removed: c });
        else if (c.added) out.push({ added: c });
        else out.push({ eq: c });
    }
    return out;
}

interface WalkCallbacks<T> {
    onEqual: (text: string, ln: LineCounter) => T;
    onReplaced: (oldText: string, newText: string, ln: LineCounter) => T[];
    onDeleted: (text: string, ln: LineCounter) => T;
    onInserted: (text: string, ln: LineCounter) => T;
}

function walkHunks<T>(older: string, newer: string, callbacks: WalkCallbacks<T>): T[] {
    const hunks = pairHunks(diffLines(older, newer));
    const out: T[] = [];
    const ln: LineCounter = { old: 0, new: 0 };

    for (const h of hunks) {
        if (h.eq) {
            for (const text of splitLines(h.eq.value)) {
                ln.old++; ln.new++;
                out.push(callbacks.onEqual(text, { ...ln }));
            }
            continue;
        }
        if (h.removed && h.added) {
            const oldLines = splitLines(h.removed.value);
            const newLines = splitLines(h.added.value);
            const max = Math.max(oldLines.length, newLines.length);
            for (let i = 0; i < max; i++) {
                const ol = oldLines[i];
                const nl = newLines[i];
                if (ol !== undefined && nl !== undefined) {
                    ln.old++; ln.new++;
                    out.push(...callbacks.onReplaced(ol, nl, { ...ln }));
                } else if (ol !== undefined) {
                    ln.old++;
                    out.push(callbacks.onDeleted(ol, { ...ln }));
                } else {
                    ln.new++;
                    out.push(callbacks.onInserted(nl!, { ...ln }));
                }
            }
            continue;
        }
        if (h.removed) for (const text of splitLines(h.removed.value)) {
            ln.old++;
            out.push(callbacks.onDeleted(text, { ...ln }));
        }
        if (h.added) for (const text of splitLines(h.added.value)) {
            ln.new++;
            out.push(callbacks.onInserted(text, { ...ln }));
        }
    }
    return out;
}

export function buildInlineLines(older: string, newer: string): DiffLine[] {
    return walkHunks<DiffLine>(older, newer, {
        onEqual: (text, ln) => ({ kind: 'eq', text, oldNo: ln.old, newNo: ln.new }),
        onReplaced: (ol, nl, ln) => {
            const { left, right } = intraWordSpans(ol, nl);
            return [
                { kind: 'del', text: ol, spans: left, oldNo: ln.old },
                { kind: 'ins', text: nl, spans: right, newNo: ln.new },
            ];
        },
        onDeleted: (text, ln) => ({ kind: 'del', text, oldNo: ln.old }),
        onInserted: (text, ln) => ({ kind: 'ins', text, newNo: ln.new }),
    });
}

export function buildSbsRows(older: string, newer: string): SbsRow[] {
    return walkHunks<SbsRow>(older, newer, {
        onEqual: (text, ln) => ({
            left: { kind: 'eq', text, oldNo: ln.old },
            right: { kind: 'eq', text, newNo: ln.new },
        }),
        onReplaced: (ol, nl, ln) => {
            const { left, right } = intraWordSpans(ol, nl);
            return [{
                left: { kind: 'del', text: ol, spans: left, oldNo: ln.old },
                right: { kind: 'ins', text: nl, spans: right, newNo: ln.new },
            }];
        },
        onDeleted: (text, ln) => ({ left: { kind: 'del', text, oldNo: ln.old } }),
        onInserted: (text, ln) => ({ right: { kind: 'ins', text, newNo: ln.new } }),
    });
}
