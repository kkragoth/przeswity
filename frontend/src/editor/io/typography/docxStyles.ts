import { ptToHalfPoints, ptToTwips, lineHeightTo240ths } from '@/editor/io/typography/units';
import { FONT_FAMILIES, BLOCK_TYPOGRAPHY_PRESETS, PAGE, type BlockKind } from '@/editor/io/typography/constants';

const HEADING_STYLE_IDS = {
    h1: 'Heading1', h2: 'Heading2', h3: 'Heading3',
    h4: 'Heading4', h5: 'Heading5', h6: 'Heading6',
} as const;

function paragraphStyleFromBlock(id: string, kind: BlockKind, name: string) {
    const t = BLOCK_TYPOGRAPHY_PRESETS[kind];
    return {
        id,
        name,
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: {
            font: FONT_FAMILIES[t.family],
            size: ptToHalfPoints(t.sizePt),
            bold: t.bold || undefined,
            italics: t.italic || undefined,
        },
        paragraph: {
            spacing: {
                line: lineHeightTo240ths(t.lineHeight),
                before: ptToTwips(t.spaceBeforePt),
                after: ptToTwips(t.spaceAfterPt),
            },
            indent: t.indentPt > 0 ? { left: ptToTwips(t.indentPt) } : undefined,
        },
    };
}

export function buildDocxStyles() {
    const body = BLOCK_TYPOGRAPHY_PRESETS.body;
    return {
        default: {
            document: {
                run: {
                    font: FONT_FAMILIES[body.family],
                    size: ptToHalfPoints(body.sizePt),
                },
                paragraph: {
                    spacing: {
                        line: lineHeightTo240ths(body.lineHeight),
                        before: ptToTwips(body.spaceBeforePt),
                        after: ptToTwips(body.spaceAfterPt),
                    },
                },
            },
        },
        paragraphStyles: [
            paragraphStyleFromBlock(HEADING_STYLE_IDS.h1, 'h1', 'Heading 1'),
            paragraphStyleFromBlock(HEADING_STYLE_IDS.h2, 'h2', 'Heading 2'),
            paragraphStyleFromBlock(HEADING_STYLE_IDS.h3, 'h3', 'Heading 3'),
            paragraphStyleFromBlock(HEADING_STYLE_IDS.h4, 'h4', 'Heading 4'),
            paragraphStyleFromBlock(HEADING_STYLE_IDS.h5, 'h5', 'Heading 5'),
            paragraphStyleFromBlock(HEADING_STYLE_IDS.h6, 'h6', 'Heading 6'),
            paragraphStyleFromBlock('IntenseQuote', 'blockquote', 'Intense Quote'),
            paragraphStyleFromBlock('Code', 'code', 'Code'),
        ],
    };
}

export interface DocxPageProperties {
    size: { width: number; height: number };
    margin: { top: number; bottom: number; left: number; right: number };
}

export function buildDocxPageProperties(): DocxPageProperties {
    return {
        size: {
            width: ptToTwips(PAGE.widthPt),
            height: ptToTwips(PAGE.heightPt),
        },
        margin: {
            top: ptToTwips(PAGE.marginTopPt),
            bottom: ptToTwips(PAGE.marginBottomPt),
            left: ptToTwips(PAGE.marginLeftPt),
            right: ptToTwips(PAGE.marginRightPt),
        },
    };
}
