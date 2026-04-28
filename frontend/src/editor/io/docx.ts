import {
    Document,
    Header,
    Footer,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    ExternalHyperlink,
    PageNumber,
    TabStopType,
} from 'docx';
import type { Editor } from '@tiptap/react';

// A4 dimensions in twips (1 inch = 1440 twips; 96px = 1 inch at 96dpi)
const A4_WIDTH_TWIPS = 11906;
const A4_HEIGHT_TWIPS = 16838;
const MARGIN_TWIPS = 1440;
const CONTENT_WIDTH_TWIPS = A4_WIDTH_TWIPS - MARGIN_TWIPS * 2; // 9026 — right tab stop position

interface JSONNode {
    type: string;
    attrs?: Record<string, unknown>;
    content?: JSONNode[];
    marks?: { type: string; attrs?: Record<string, unknown> }[];
    text?: string;
}

export interface ExportOptions {
    acceptSuggestions: boolean;
    headerLeft?: string;
    headerRight?: string;
    footerLeft?: string;
    footerRight?: string;
}

function alignment(attrs: JSONNode['attrs']): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
    const a = attrs?.textAlign as string | undefined;
    if (a === 'center') return AlignmentType.CENTER;
    if (a === 'right') return AlignmentType.RIGHT;
    if (a === 'justify') return AlignmentType.JUSTIFIED;
    return undefined;
}

function inlinesToRuns(nodes: JSONNode[] | undefined, opts: ExportOptions): (TextRun | ExternalHyperlink)[] {
    if (!nodes) return [];
    const runs: (TextRun | ExternalHyperlink)[] = [];
    for (const n of nodes) {
        if (n.type !== 'text') continue;
        const marks = n.marks ?? [];
        const isDeletion = marks.some((m) => m.type === 'deletion');
        const isInsertion = marks.some((m) => m.type === 'insertion');
        if (opts.acceptSuggestions && isDeletion) continue;
        const run = new TextRun({
            text: n.text ?? '',
            bold: marks.some((m) => m.type === 'bold'),
            italics: marks.some((m) => m.type === 'italic'),
            underline: marks.some((m) => m.type === 'underline') ? {} : undefined,
            strike: marks.some((m) => m.type === 'strike') && !opts.acceptSuggestions ? true : undefined,
            color: !opts.acceptSuggestions
                ? isDeletion ? '9CA3AF' : isInsertion ? '15803D' : undefined
                : undefined,
        });
        const link = marks.find((m) => m.type === 'link');
        if (link) {
            runs.push(new ExternalHyperlink({ link: (link.attrs?.href as string) ?? '#', children: [run] }));
        } else {
            runs.push(run);
        }
    }
    return runs;
}

function blockToParagraphs(node: JSONNode, opts: ExportOptions): Paragraph[] {
    switch (node.type) {
        case 'paragraph':
            return [new Paragraph({ alignment: alignment(node.attrs), children: inlinesToRuns(node.content, opts) })];
        case 'heading': {
            const level = (node.attrs?.level as number) ?? 1;
            const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
                1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3,
                4: HeadingLevel.HEADING_4, 5: HeadingLevel.HEADING_5, 6: HeadingLevel.HEADING_6,
            };
            return [new Paragraph({ heading: headingMap[level] ?? HeadingLevel.HEADING_1, alignment: alignment(node.attrs), children: inlinesToRuns(node.content, opts) })];
        }
        case 'blockquote':
            return (node.content ?? []).map((c) => new Paragraph({ style: 'IntenseQuote', children: inlinesToRuns(c.content, opts) }));
        case 'bulletList':
            return (node.content ?? []).flatMap((li) =>
                (li.content ?? []).map((c) => new Paragraph({ bullet: { level: 0 }, children: inlinesToRuns(c.content, opts) })),
            );
        case 'orderedList':
            return (node.content ?? []).flatMap((li, i) =>
                (li.content ?? []).map((c) => new Paragraph({ numbering: { reference: 'numbered', level: 0 }, children: [new TextRun({ text: `${i + 1}. ` }), ...inlinesToRuns(c.content, opts)] })),
            );
        case 'taskList':
            return (node.content ?? []).flatMap((li) => {
                const checked = li.attrs?.checked ? '☑' : '☐';
                return (li.content ?? []).map((c) => new Paragraph({ children: [new TextRun({ text: `${checked} ` }), ...inlinesToRuns(c.content, opts)] }));
            });
        case 'codeBlock':
            return [new Paragraph({ style: 'Code', children: [new TextRun({ text: node.content?.[0]?.text ?? '', font: 'Courier New' })] })];
        case 'horizontalRule':
            return [new Paragraph({ border: { bottom: { color: '999999', style: 'single', size: 6, space: 1 } }, children: [] })];
        default:
            return [new Paragraph({ children: inlinesToRuns(node.content, opts) })];
    }
}

// Converts a header/footer string with {page}/{total} tokens into TextRun children.
// {page} → Word PAGE field, {total} → Word NUMPAGES field.
function parseHfTokens(text: string): TextRun[] {
    const plain = text.replace(/<[^>]+>/g, '').trim();
    if (!plain) return [];
    const parts = plain.split(/(\{page\}|\{total\})/);
    return parts.flatMap((part): TextRun[] => {
        if (part === '{page}') return [new TextRun({ children: [PageNumber.CURRENT] })];
        if (part === '{total}') return [new TextRun({ children: [PageNumber.TOTAL_PAGES] })];
        return part ? [new TextRun({ text: part })] : [];
    });
}

function buildHfParagraph(left: string, right: string): Paragraph {
    const leftRuns = parseHfTokens(left);
    const rightRuns = parseHfTokens(right);
    return new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH_TWIPS }],
        children: [...leftRuns, ...(rightRuns.length > 0 ? [new TextRun({ text: '\t' }), ...rightRuns] : [])],
    });
}

export async function editorToDocxBlob(editor: Editor, opts: ExportOptions = { acceptSuggestions: true }): Promise<Blob> {
    const json = editor.getJSON() as JSONNode;
    const paragraphs: Paragraph[] = (json.content ?? []).flatMap((b) => blockToParagraphs(b, opts));

    const headerLeft = opts.headerLeft ?? '';
    const headerRight = opts.headerRight ?? '';
    const footerLeft = opts.footerLeft ?? '';
    const footerRight = opts.footerRight ?? '';

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    size: { width: A4_WIDTH_TWIPS, height: A4_HEIGHT_TWIPS },
                    margin: { top: MARGIN_TWIPS, bottom: MARGIN_TWIPS, left: MARGIN_TWIPS, right: MARGIN_TWIPS },
                },
            },
            headers: headerLeft || headerRight
                ? { default: new Header({ children: [buildHfParagraph(headerLeft, headerRight)] }) }
                : undefined,
            footers: footerLeft || footerRight
                ? { default: new Footer({ children: [buildHfParagraph(footerLeft, footerRight)] }) }
                : undefined,
            children: paragraphs,
        }],
    });
    return Packer.toBlob(doc);
}
