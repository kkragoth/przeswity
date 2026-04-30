import { AlignmentType, Paragraph, TextRun } from 'docx';
import type { JSONNode } from '@/editor/types';
import { FONT_FAMILIES, ptToHalfPoints, type BlockKind, TYPOGRAPHY } from '@/editor/io/typography';
import { inlinesToRuns } from '@/editor/io/docx/inlines';
import type { ExportOptions } from '@/editor/io/docx';

const HEADING_STYLE: Record<number, string> = { 1: 'Heading1', 2: 'Heading2', 3: 'Heading3', 4: 'Heading4', 5: 'Heading5', 6: 'Heading6' };

function alignment(attrs: JSONNode['attrs']): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
    const a = attrs?.textAlign as string | undefined;
    if (a === 'center') return AlignmentType.CENTER;
    if (a === 'right') return AlignmentType.RIGHT;
    if (a === 'justify') return AlignmentType.JUSTIFIED;
    return undefined;
}

function listMarkerRun(text: string): TextRun {
    return new TextRun({ text, font: FONT_FAMILIES[TYPOGRAPHY.listItem.family], size: ptToHalfPoints(TYPOGRAPHY.listItem.sizePt) });
}

export function blockToParagraphs(node: JSONNode, opts: ExportOptions): Paragraph[] {
    switch (node.type) {
        case 'paragraph':
            return [new Paragraph({ alignment: alignment(node.attrs), children: inlinesToRuns(node.content, opts, 'body') })];
        case 'heading': {
            const level = (node.attrs?.level as number) ?? 1;
            return [new Paragraph({ style: HEADING_STYLE[level] ?? 'Heading1', alignment: alignment(node.attrs), children: inlinesToRuns(node.content, opts, `h${level}` as BlockKind) })];
        }
        case 'blockquote':
            return (node.content ?? []).map((c) => new Paragraph({ style: 'IntenseQuote', children: inlinesToRuns(c.content, opts, 'blockquote') }));
        case 'bulletList':
            return (node.content ?? []).flatMap((li) => (li.content ?? []).map((c) => new Paragraph({ bullet: { level: 0 }, children: inlinesToRuns(c.content, opts, 'listItem') })));
        case 'orderedList':
            return (node.content ?? []).flatMap((li, i) => (li.content ?? []).map((c) => new Paragraph({ children: [listMarkerRun(`${i + 1}. `), ...inlinesToRuns(c.content, opts, 'listItem')] })));
        case 'taskList':
            return (node.content ?? []).flatMap((li) => (li.content ?? []).map((c) => new Paragraph({ children: [listMarkerRun(`${li.attrs?.checked ? '☑' : '☐'} `), ...inlinesToRuns(c.content, opts, 'listItem')] })));
        case 'codeBlock':
            return [new Paragraph({ style: 'Code', children: [new TextRun({ text: node.content?.[0]?.text ?? '', font: FONT_FAMILIES[TYPOGRAPHY.code.family], size: ptToHalfPoints(TYPOGRAPHY.code.sizePt) })] })];
        case 'horizontalRule':
            return [new Paragraph({ border: { bottom: { color: '999999', style: 'single', size: 6, space: 1 } }, children: [] })];
        default:
            return [new Paragraph({ children: inlinesToRuns(node.content, opts, 'body') })];
    }
}
