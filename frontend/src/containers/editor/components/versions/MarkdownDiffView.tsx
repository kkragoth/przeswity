import { Fragment, useMemo, type ReactNode } from 'react';
import type { JSONNode } from '@/editor/versions/diffDoc';
import { nodeToMarkdown } from '@/editor/io/markdown';
import { buildInlineLines, buildSbsRows, LineKind, type DiffLine } from '@/editor/diff/buildDiffDocument';

export interface MarkdownDiffViewProps {
    diffJson: JSONNode;
    olderJson?: JSONNode;
    newerJson?: JSONNode;
    olderLabel: string;
    newerLabel: string;
    useSbs: boolean;
    sbsAvailable: boolean;
}

export function MarkdownDiffView({
    diffJson,
    olderJson,
    newerJson,
    olderLabel,
    newerLabel,
    useSbs,
    sbsAvailable,
}: MarkdownDiffViewProps) {
    if (useSbs && olderJson && newerJson) {
        return (
            <MarkdownSideBySide
                olderJson={olderJson}
                newerJson={newerJson}
                olderLabel={olderLabel}
                newerLabel={newerLabel}
            />
        );
    }
    if (sbsAvailable && olderJson && newerJson) {
        return <MarkdownInlineDiff olderJson={olderJson} newerJson={newerJson} />;
    }
    return <pre className="md-diff md-diff-sbs">{nodeToMarkdown(diffJson)}</pre>;
}

function renderText(line: DiffLine): ReactNode {
    if (!line.spans) return line.text || ' ';
    return line.spans.map((s, i) => (
        <span key={i} className={s.kind === LineKind.Eq ? undefined : `md-diff-span-${s.kind}`}>
            {s.text}
        </span>
    ));
}

function gutter(kind: LineKind): string {
    if (kind === LineKind.Ins) return '+';
    if (kind === LineKind.Del) return '−';
    return ' ';
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
            {lines.map((l) => <Line key={`${l.kind}-${l.oldNo ?? ''}-${l.newNo ?? ''}`} line={l} />)}
        </pre>
    );
}

export function MarkdownSideBySide({
    olderJson,
    newerJson,
    olderLabel,
    newerLabel,
}: {
    olderJson: JSONNode;
    newerJson: JSONNode;
    olderLabel: string;
    newerLabel: string;
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
                    {rows.map((r) => (
                        <Fragment key={`l-${r.left?.oldNo ?? '_'}`}>{r.left ? <Line line={r.left} showNew={false} /> : <BlankLine slots={1} />}</Fragment>
                    ))}
                </pre>
            </div>
            <div className="diff-sbs-col">
                <div className="diff-sbs-label">{newerLabel}</div>
                <pre className="md-diff md-diff-sbs">
                    {rows.map((r) => (
                        <Fragment key={`r-${r.right?.newNo ?? '_'}`}>{r.right ? <Line line={r.right} showOld={false} /> : <BlankLine slots={1} />}</Fragment>
                    ))}
                </pre>
            </div>
        </div>
    );
}
