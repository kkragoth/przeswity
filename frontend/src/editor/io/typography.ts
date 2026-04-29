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

export const PAGE = {
    widthPt: 595,
    heightPt: 842,
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
