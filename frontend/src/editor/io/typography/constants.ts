export { ptToHalfPoints, ptToTwips, ptToPx, lineHeightTo240ths } from '@/editor/io/typography/units';

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

/** Per-block typography presets (formerly TYPOGRAPHY). */
export const BLOCK_TYPOGRAPHY_PRESETS: Record<BlockKind, BlockTypography> = {
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
