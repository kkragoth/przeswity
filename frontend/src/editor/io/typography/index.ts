// Re-exports for back-compat.
export {
    FONT_FAMILIES,
    BLOCK_TYPOGRAPHY_PRESETS,
    BLOCK_TYPOGRAPHY_PRESETS as TYPOGRAPHY,
    PAGE,
    FONT_VARIANTS,
    type FontKey,
    type BlockKind,
    type BlockTypography,
    type FontVariant,
} from '@/editor/io/typography/constants';

export {
    ptToHalfPoints,
    ptToTwips,
    ptToPx,
    lineHeightTo240ths,
} from '@/editor/io/typography/units';

export {
    buildDocxStyles,
    buildDocxPageProperties,
    type DocxPageProperties,
} from '@/editor/io/typography/docxStyles';
