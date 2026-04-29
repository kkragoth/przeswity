import {
    Document,
    Header,
    Footer,
    Packer,
    Paragraph,
    TextRun,
    AlignmentType,
    ExternalHyperlink,
    PageNumber,
    TabStopType,
} from 'docx';
import type { Editor } from '@tiptap/react';
import {
    FONT_FAMILIES,
    FONT_VARIANTS,
    TYPOGRAPHY,
    buildDocxStyles,
    buildDocxPageProperties,
    ptToHalfPoints,
    type BlockKind,
} from '@/editor/io/typography';

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

interface DocxFont {
    name: string;
    data: Buffer;
}

let fontBytesCache: Promise<DocxFont[]> | null = null;

async function loadFontBytes(): Promise<DocxFont[]> {
    if (!fontBytesCache) {
        fontBytesCache = Promise.all(
            FONT_VARIANTS.map(async (v) => {
                const resp = await fetch(v.file);
                if (!resp.ok) throw new Error(`Failed to load font ${v.file}: ${resp.status}`);
                const bytes = new Uint8Array(await resp.arrayBuffer());
                return { name: v.family, data: bytes as unknown as Buffer };
            }),
        );
    }
    return fontBytesCache;
}

const HEADING_STYLE: Record<number, string> = {
    1: 'Heading1', 2: 'Heading2', 3: 'Heading3',
    4: 'Heading4', 5: 'Heading5', 6: 'Heading6',
};

const pageProperties = buildDocxPageProperties();
const CONTENT_WIDTH_TWIPS = pageProperties.size.width - pageProperties.margin.left - pageProperties.margin.right;

function alignment(attrs: JSONNode['attrs']): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
    const a = attrs?.textAlign as string | undefined;
    if (a === 'center') return AlignmentType.CENTER;
    if (a === 'right') return AlignmentType.RIGHT;
    if (a === 'justify') return AlignmentType.JUSTIFIED;
    return undefined;
}

function inlinesToRuns(
    nodes: JSONNode[] | undefined,
    opts: ExportOptions,
    blockKind: BlockKind = 'body',
): (TextRun | ExternalHyperlink)[] {
    if (!nodes) return [];
    const t = TYPOGRAPHY[blockKind];
    const runs: (TextRun | ExternalHyperlink)[] = [];
    for (const n of nodes) {
        if (n.type !== 'text') continue;
        const marks = n.marks ?? [];
        const isDeletion = marks.some((m) => m.type === 'deletion');
        const isInsertion = marks.some((m) => m.type === 'insertion');
        if (opts.acceptSuggestions && isDeletion) continue;

        const run = new TextRun({
            text: n.text ?? '',
            font: FONT_FAMILIES[t.family],
            size: ptToHalfPoints(t.sizePt),
            bold: t.bold || marks.some((m) => m.type === 'bold'),
            italics: t.italic || marks.some((m) => m.type === 'italic'),
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

function listMarkerRun(text: string): TextRun {
    return new TextRun({
        text,
        font: FONT_FAMILIES[TYPOGRAPHY.listItem.family],
        size: ptToHalfPoints(TYPOGRAPHY.listItem.sizePt),
    });
}

function blockToParagraphs(node: JSONNode, opts: ExportOptions): Paragraph[] {
    switch (node.type) {
        case 'paragraph':
            return [new Paragraph({
                alignment: alignment(node.attrs),
                children: inlinesToRuns(node.content, opts, 'body'),
            })];
        case 'heading': {
            const level = (node.attrs?.level as number) ?? 1;
            const styleId = HEADING_STYLE[level] ?? 'Heading1';
            const kind = `h${level}` as BlockKind;
            return [new Paragraph({
                style: styleId,
                alignment: alignment(node.attrs),
                children: inlinesToRuns(node.content, opts, kind),
            })];
        }
        case 'blockquote':
            return (node.content ?? []).map((c) => new Paragraph({
                style: 'IntenseQuote',
                children: inlinesToRuns(c.content, opts, 'blockquote'),
            }));
        case 'bulletList':
            return (node.content ?? []).flatMap((li) =>
                (li.content ?? []).map((c) => new Paragraph({
                    bullet: { level: 0 },
                    children: inlinesToRuns(c.content, opts, 'listItem'),
                })),
            );
        case 'orderedList':
            return (node.content ?? []).flatMap((li, i) =>
                (li.content ?? []).map((c) => new Paragraph({
                    children: [listMarkerRun(`${i + 1}. `), ...inlinesToRuns(c.content, opts, 'listItem')],
                })),
            );
        case 'taskList':
            return (node.content ?? []).flatMap((li) => {
                const checked = li.attrs?.checked ? '☑' : '☐';
                return (li.content ?? []).map((c) => new Paragraph({
                    children: [listMarkerRun(`${checked} `), ...inlinesToRuns(c.content, opts, 'listItem')],
                }));
            });
        case 'codeBlock':
            return [new Paragraph({
                style: 'Code',
                children: [new TextRun({
                    text: node.content?.[0]?.text ?? '',
                    font: FONT_FAMILIES[TYPOGRAPHY.code.family],
                    size: ptToHalfPoints(TYPOGRAPHY.code.sizePt),
                })],
            })];
        case 'horizontalRule':
            return [new Paragraph({
                border: { bottom: { color: '999999', style: 'single', size: 6, space: 1 } },
                children: [],
            })];
        default:
            return [new Paragraph({ children: inlinesToRuns(node.content, opts, 'body') })];
    }
}

function parseHfTokens(text: string): TextRun[] {
    const plain = text.replace(/<[^>]+>/g, '').trim();
    if (!plain) return [];
    const parts = plain.split(/(\{page\}|\{total\})/);
    const baseProps = {
        font: FONT_FAMILIES.serif,
        size: ptToHalfPoints(TYPOGRAPHY.body.sizePt),
    };
    return parts.flatMap((part): TextRun[] => {
        if (part === '{page}') return [new TextRun({ ...baseProps, children: [PageNumber.CURRENT] })];
        if (part === '{total}') return [new TextRun({ ...baseProps, children: [PageNumber.TOTAL_PAGES] })];
        return part ? [new TextRun({ ...baseProps, text: part })] : [];
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

    const fonts = await loadFontBytes();

    const doc = new Document({
        fonts,
        styles: buildDocxStyles(),
        sections: [{
            properties: { page: { size: pageProperties.size, margin: pageProperties.margin } },
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
