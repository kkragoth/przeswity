import { ExternalHyperlink, TextRun } from 'docx';
import type { JSONNode } from '@/editor/types';
import { FONT_FAMILIES, ptToHalfPoints, type BlockKind, TYPOGRAPHY } from '@/editor/io/typography';
import type { ExportOptions } from '@/editor/io/docx';

export function inlinesToRuns(
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
            color: !opts.acceptSuggestions ? (isDeletion ? '9CA3AF' : isInsertion ? '15803D' : undefined) : undefined,
        });
        const link = marks.find((m) => m.type === 'link');
        if (link) runs.push(new ExternalHyperlink({ link: (link.attrs?.href as string) ?? '#', children: [run] }));
        else runs.push(run);
    }
    return runs;
}
