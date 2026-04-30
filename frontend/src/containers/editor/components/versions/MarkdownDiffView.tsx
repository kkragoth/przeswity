import { Fragment, useMemo, type ReactNode } from 'react';
import { diffLines, diffWordsWithSpace, type Change } from 'diff';
import type { JSONNode } from '@/editor/versions/diffDoc';
import { nodeToMarkdown } from '@/editor/io/markdown';

type LineKind = 'eq' | 'ins' | 'del';

interface DiffLine {
  kind: LineKind
  text: string
  oldNo?: number
  newNo?: number
  spans?: { kind: LineKind; text: string }[]
}

interface SbsRow {
  left?: DiffLine
  right?: DiffLine
}

function splitLines(value: string): string[] {
    if (value === '') return [];
    return value.endsWith('\n') ? value.slice(0, -1).split('\n') : value.split('\n');
}

function intraWordSpans(oldLine: string, newLine: string): { left: DiffLine['spans']; right: DiffLine['spans'] } {
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

function pairHunks(changes: Change[]): { removed?: Change; added?: Change; eq?: Change }[] {
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

interface LineCounter { old: number; new: number }

function buildInlineLines(older: string, newer: string): DiffLine[] {
    const hunks = pairHunks(diffLines(older, newer));
    const lines: DiffLine[] = [];
    const ln: LineCounter = { old: 0, new: 0 };
    for (const h of hunks) {
        if (h.eq) {
            for (const t of splitLines(h.eq.value)) {
                ln.old++; ln.new++;
                lines.push({ kind: 'eq', text: t, oldNo: ln.old, newNo: ln.new });
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
                    const { left, right } = intraWordSpans(ol, nl);
                    ln.old++;
                    lines.push({ kind: 'del', text: ol, spans: left, oldNo: ln.old });
                    ln.new++;
                    lines.push({ kind: 'ins', text: nl, spans: right, newNo: ln.new });
                } else if (ol !== undefined) {
                    ln.old++;
                    lines.push({ kind: 'del', text: ol, oldNo: ln.old });
                } else {
                    ln.new++;
                    lines.push({ kind: 'ins', text: nl!, newNo: ln.new });
                }
            }
            continue;
        }
        if (h.removed) for (const t of splitLines(h.removed.value)) {
            ln.old++;
            lines.push({ kind: 'del', text: t, oldNo: ln.old });
        }
        if (h.added) for (const t of splitLines(h.added.value)) {
            ln.new++;
            lines.push({ kind: 'ins', text: t, newNo: ln.new });
        }
    }
    return lines;
}

function buildSbsRows(older: string, newer: string): SbsRow[] {
    const hunks = pairHunks(diffLines(older, newer));
    const rows: SbsRow[] = [];
    const ln: LineCounter = { old: 0, new: 0 };
    for (const h of hunks) {
        if (h.eq) {
            for (const t of splitLines(h.eq.value)) {
                ln.old++; ln.new++;
                rows.push({
                    left: { kind: 'eq', text: t, oldNo: ln.old },
                    right: { kind: 'eq', text: t, newNo: ln.new },
                });
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
                    const { left, right } = intraWordSpans(ol, nl);
                    ln.old++; ln.new++;
                    rows.push({
                        left: { kind: 'del', text: ol, spans: left, oldNo: ln.old },
                        right: { kind: 'ins', text: nl, spans: right, newNo: ln.new },
                    });
                } else if (ol !== undefined) {
                    ln.old++;
                    rows.push({ left: { kind: 'del', text: ol, oldNo: ln.old } });
                } else {
                    ln.new++;
                    rows.push({ right: { kind: 'ins', text: nl!, newNo: ln.new } });
                }
            }
            continue;
        }
        if (h.removed) for (const t of splitLines(h.removed.value)) {
            ln.old++;
            rows.push({ left: { kind: 'del', text: t, oldNo: ln.old } });
        }
        if (h.added) for (const t of splitLines(h.added.value)) {
            ln.new++;
            rows.push({ right: { kind: 'ins', text: t, newNo: ln.new } });
        }
    }
    return rows;
}

function renderText(line: DiffLine): ReactNode {
    if (!line.spans) return line.text || ' ';
    return line.spans.map((s, i) => (
        <span key={i} className={s.kind === 'eq' ? undefined : `md-diff-span-${s.kind}`}>
            {s.text}
        </span>
    ));
}

function gutter(kind: LineKind): string {
    return kind === 'ins' ? '+' : kind === 'del' ? '−' : ' ';
}

function Line({ line, showOld = true, showNew = true }: { line: DiffLine; showOld?: boolean; showNew?: boolean }) {
    return (
        <div className={`md-diff-line md-diff-${line.kind}`}>
            {showOld && <span className="md-diff-lineno">{line.oldNo ?? ''}</span>}
            {showNew && <span className="md-diff-lineno">{line.newNo ?? ''}</span>}
            <span className="md-diff-gutter">{gutter(line.kind)}</span>
            <span className="md-diff-text">{renderText(line)}</span>
        </div>
    );
}

function BlankLine({ slots }: { slots: number }) {
    return (
        <div className="md-diff-line md-diff-blank">
            {Array.from({ length: slots }).map((_, i) => <span key={i} className="md-diff-lineno" />)}
            <span className="md-diff-gutter">&nbsp;</span>
            <span className="md-diff-text">&nbsp;</span>
        </div>
    );
}

export function MarkdownInlineDiff({ olderJson, newerJson }: { olderJson: JSONNode; newerJson: JSONNode }) {
    const lines = useMemo(
        () => buildInlineLines(nodeToMarkdown(olderJson), nodeToMarkdown(newerJson)),
        [olderJson, newerJson],
    );
    return (
        <pre className="md-diff md-diff-inline">
            {lines.map((l, i) => <Line key={i} line={l} />)}
        </pre>
    );
}

export function MarkdownSideBySide({
    olderJson,
    newerJson,
    olderLabel,
    newerLabel,
}: {
  olderJson: JSONNode
  newerJson: JSONNode
  olderLabel: string
  newerLabel: string
}) {
    const rows = useMemo(
        () => buildSbsRows(nodeToMarkdown(olderJson), nodeToMarkdown(newerJson)),
        [olderJson, newerJson],
    );
    return (
        <div className="diff-sbs">
            <div className="diff-sbs-col">
                <div className="diff-sbs-label">{olderLabel}</div>
                <pre className="md-diff md-diff-sbs">
                    {rows.map((r, i) => (
                        <Fragment key={i}>{r.left ? <Line line={r.left} showNew={false} /> : <BlankLine slots={1} />}</Fragment>
                    ))}
                </pre>
            </div>
            <div className="diff-sbs-col">
                <div className="diff-sbs-label">{newerLabel}</div>
                <pre className="md-diff md-diff-sbs">
                    {rows.map((r, i) => (
                        <Fragment key={i}>{r.right ? <Line line={r.right} showOld={false} /> : <BlankLine slots={1} />}</Fragment>
                    ))}
                </pre>
            </div>
        </div>
    );
}
