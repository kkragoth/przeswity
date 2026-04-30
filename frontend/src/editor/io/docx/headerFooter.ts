import { Paragraph, PageNumber, TabStopType, TextRun } from 'docx';
import { FONT_FAMILIES, ptToHalfPoints, TYPOGRAPHY } from '@/editor/io/typography';

export function buildHfParagraph(left: string, right: string, contentWidthTwips: number): Paragraph {
    const leftRuns = parseHfTokens(left);
    const rightRuns = parseHfTokens(right);
    return new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: contentWidthTwips }],
        children: [...leftRuns, ...(rightRuns.length > 0 ? [new TextRun({ text: '\t' }), ...rightRuns] : [])],
    });
}

function parseHfTokens(text: string): TextRun[] {
    const plain = text.replace(/<[^>]+>/g, '').trim();
    if (!plain) return [];
    const parts = plain.split(/(\{page\}|\{total\})/);
    const baseProps = { font: FONT_FAMILIES.serif, size: ptToHalfPoints(TYPOGRAPHY.body.sizePt) };
    return parts.flatMap((part): TextRun[] => {
        if (part === '{page}') return [new TextRun({ ...baseProps, children: [PageNumber.CURRENT] })];
        if (part === '{total}') return [new TextRun({ ...baseProps, children: [PageNumber.TOTAL_PAGES] })];
        return part ? [new TextRun({ ...baseProps, text: part })] : [];
    });
}
