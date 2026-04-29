// Single source of truth for font families, sizes, line heights, spacing,
// page setup. Both the editor's CSS layer and the DOCX exporter read from here.

export const FONT_FAMILIES = {
    serif: 'Liberation Serif',
    sans:  'Liberation Sans',
    mono:  'Liberation Mono',
} as const;

export type FontKey = keyof typeof FONT_FAMILIES;

export interface BlockTypography {
    family: FontKey;
    sizePt: number;
    bold: boolean;
    italic: boolean;
    lineHeight: number;
    spaceBeforePt: number;
    spaceAfterPt: number;
    indentPt: number;
}

export type BlockKind =
    | 'body'
    | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    | 'blockquote'
    | 'code'
    | 'listItem';

export const TYPOGRAPHY: Record<BlockKind, BlockTypography> = {
    body:       { family: 'serif', sizePt: 12,    bold: false, italic: false, lineHeight: 1.5,  spaceBeforePt: 0,  spaceAfterPt: 8,  indentPt: 0  },
    h1:         { family: 'serif', sizePt: 22.5,  bold: true,  italic: false, lineHeight: 1.2,  spaceBeforePt: 14, spaceAfterPt: 6,  indentPt: 0  },
    h2:         { family: 'serif', sizePt: 16.5,  bold: true,  italic: false, lineHeight: 1.3,  spaceBeforePt: 12, spaceAfterPt: 6,  indentPt: 0  },
    h3:         { family: 'serif', sizePt: 13.5,  bold: true,  italic: false, lineHeight: 1.35, spaceBeforePt: 10, spaceAfterPt: 5,  indentPt: 0  },
    h4:         { family: 'serif', sizePt: 12,    bold: true,  italic: false, lineHeight: 1.35, spaceBeforePt: 8,  spaceAfterPt: 4,  indentPt: 0  },
    h5:         { family: 'serif', sizePt: 12,    bold: true,  italic: false, lineHeight: 1.35, spaceBeforePt: 8,  spaceAfterPt: 4,  indentPt: 0  },
    h6:         { family: 'serif', sizePt: 12,    bold: true,  italic: true,  lineHeight: 1.35, spaceBeforePt: 8,  spaceAfterPt: 4,  indentPt: 0  },
    blockquote: { family: 'serif', sizePt: 12,    bold: false, italic: true,  lineHeight: 1.5,  spaceBeforePt: 6,  spaceAfterPt: 12, indentPt: 21 },
    code:       { family: 'mono',  sizePt: 9.75,  bold: false, italic: false, lineHeight: 1.6,  spaceBeforePt: 6,  spaceAfterPt: 12, indentPt: 0  },
    listItem:   { family: 'serif', sizePt: 12,    bold: false, italic: false, lineHeight: 1.5,  spaceBeforePt: 0,  spaceAfterPt: 0,  indentPt: 18 },
};

// A4 in points. width/height are non-integer to match the standard
// A4 twips values (11906 x 16838) used by Microsoft Word.
export const PAGE = {
    widthPt: 595.3,
    heightPt: 841.9,
    marginTopPt: 72,
    marginBottomPt: 72,
    marginLeftPt: 72,
    marginRightPt: 72,
} as const;

export function ptToHalfPoints(pt: number): number {
    return Math.round(pt * 2);
}

export function ptToTwips(pt: number): number {
    return Math.round(pt * 20);
}

export function ptToPx(pt: number): number {
    return Math.round((pt * 96) / 72);
}

export function lineHeightTo240ths(multiplier: number): number {
    return Math.round(multiplier * 240);
}

export interface FontVariant {
    family: string;
    weight: 400 | 700;
    style:  'normal' | 'italic';
    file:   string;
}

// ---------- DOCX style builder ----------

const HEADING_STYLE_IDS = {
    h1: 'Heading1', h2: 'Heading2', h3: 'Heading3',
    h4: 'Heading4', h5: 'Heading5', h6: 'Heading6',
} as const;

function paragraphStyleFromBlock(id: string, kind: BlockKind, name: string) {
    const t = TYPOGRAPHY[kind];
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
    const body = TYPOGRAPHY.body;
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

export const FONT_VARIANTS: FontVariant[] = [
    { family: 'Liberation Serif', weight: 400, style: 'normal', file: '/fonts/liberation/LiberationSerif-Regular.ttf'    },
    { family: 'Liberation Serif', weight: 700, style: 'normal', file: '/fonts/liberation/LiberationSerif-Bold.ttf'       },
    { family: 'Liberation Serif', weight: 400, style: 'italic', file: '/fonts/liberation/LiberationSerif-Italic.ttf'     },
    { family: 'Liberation Serif', weight: 700, style: 'italic', file: '/fonts/liberation/LiberationSerif-BoldItalic.ttf' },
    { family: 'Liberation Sans',  weight: 400, style: 'normal', file: '/fonts/liberation/LiberationSans-Regular.ttf'     },
    { family: 'Liberation Sans',  weight: 700, style: 'normal', file: '/fonts/liberation/LiberationSans-Bold.ttf'        },
    { family: 'Liberation Sans',  weight: 400, style: 'italic', file: '/fonts/liberation/LiberationSans-Italic.ttf'      },
    { family: 'Liberation Sans',  weight: 700, style: 'italic', file: '/fonts/liberation/LiberationSans-BoldItalic.ttf'  },
    { family: 'Liberation Mono',  weight: 400, style: 'normal', file: '/fonts/liberation/LiberationMono-Regular.ttf'     },
    { family: 'Liberation Mono',  weight: 700, style: 'normal', file: '/fonts/liberation/LiberationMono-Bold.ttf'        },
    { family: 'Liberation Mono',  weight: 400, style: 'italic', file: '/fonts/liberation/LiberationMono-Italic.ttf'      },
    { family: 'Liberation Mono',  weight: 700, style: 'italic', file: '/fonts/liberation/LiberationMono-BoldItalic.ttf'  },
];
