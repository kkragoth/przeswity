import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    ExternalHyperlink,
} from 'docx';
import type { Editor } from '@tiptap/react';

interface JSONNode {
  type: string
  attrs?: Record<string, unknown>
  content?: JSONNode[]
  marks?: { type: string; attrs?: Record<string, unknown> }[]
  text?: string
}

interface ExportOptions {
  acceptSuggestions: boolean
}

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
): (TextRun | ExternalHyperlink)[] {
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
                ? isDeletion
                    ? '9CA3AF'
                    : isInsertion
                        ? '15803D'
                        : undefined
                : undefined,
        });
        const link = marks.find((m) => m.type === 'link');
        if (link) {
            runs.push(
                new ExternalHyperlink({
                    link: (link.attrs?.href as string) ?? '#',
                    children: [run],
                }),
            );
        } else {
            runs.push(run);
        }
    }
    return runs;
}

function blockToParagraphs(node: JSONNode, opts: ExportOptions): Paragraph[] {
    switch (node.type) {
        case 'paragraph':
            return [
                new Paragraph({
                    alignment: alignment(node.attrs),
                    children: inlinesToRuns(node.content, opts),
                }),
            ];
        case 'heading': {
            const level = (node.attrs?.level as number) ?? 1;
            const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
                1: HeadingLevel.HEADING_1,
                2: HeadingLevel.HEADING_2,
                3: HeadingLevel.HEADING_3,
                4: HeadingLevel.HEADING_4,
                5: HeadingLevel.HEADING_5,
                6: HeadingLevel.HEADING_6,
            };
            return [
                new Paragraph({
                    heading: headingMap[level] ?? HeadingLevel.HEADING_1,
                    alignment: alignment(node.attrs),
                    children: inlinesToRuns(node.content, opts),
                }),
            ];
        }
        case 'blockquote': {
            return (node.content ?? []).map(
                (c) =>
                    new Paragraph({
                        style: 'IntenseQuote',
                        children: inlinesToRuns(c.content, opts),
                    }),
            );
        }
        case 'bulletList':
            return (node.content ?? []).flatMap((li) =>
                (li.content ?? []).map(
                    (c) =>
                        new Paragraph({
                            bullet: { level: 0 },
                            children: inlinesToRuns(c.content, opts),
                        }),
                ),
            );
        case 'orderedList':
            return (node.content ?? []).flatMap((li, i) =>
                (li.content ?? []).map(
                    (c) =>
                        new Paragraph({
                            numbering: { reference: 'numbered', level: 0 },
                            children: [
                                new TextRun({ text: `${i + 1}. ` }),
                                ...inlinesToRuns(c.content, opts),
                            ],
                        }),
                ),
            );
        case 'taskList':
            return (node.content ?? []).flatMap((li) => {
                const checked = li.attrs?.checked ? '☑' : '☐';
                return (li.content ?? []).map(
                    (c) =>
                        new Paragraph({
                            children: [
                                new TextRun({ text: `${checked} ` }),
                                ...inlinesToRuns(c.content, opts),
                            ],
                        }),
                );
            });
        case 'codeBlock':
            return [
                new Paragraph({
                    style: 'Code',
                    children: [new TextRun({ text: node.content?.[0]?.text ?? '', font: 'Courier New' })],
                }),
            ];
        case 'horizontalRule':
            return [
                new Paragraph({
                    border: { bottom: { color: '999999', style: 'single', size: 6, space: 1 } },
                    children: [],
                }),
            ];
        default:
            return [
                new Paragraph({
                    children: inlinesToRuns(node.content, opts),
                }),
            ];
    }
}

export async function editorToDocxBlob(
    editor: Editor,
    opts: ExportOptions = { acceptSuggestions: true },
): Promise<Blob> {
    const json = editor.getJSON() as JSONNode;
    const paragraphs: Paragraph[] = (json.content ?? []).flatMap((b) => blockToParagraphs(b, opts));
    const doc = new Document({
        sections: [{ properties: {}, children: paragraphs }],
    });
    return Packer.toBlob(doc);
}
