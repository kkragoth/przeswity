// Unit conversion constants for DOCX/typography output.
export const DPI = 96;
export const PT_PER_INCH = 72;
export const TWIPS_PER_PT = 20;
export const HALF_POINTS_PER_PT = 2;
export const LINE_HEIGHT_240THS = 240;

/** pt → half-points (DOCX sz field) */
export function ptToHalfPoints(pt: number): number {
    return Math.round(pt * HALF_POINTS_PER_PT);
}

/** pt → twips (DOCX spacing/indent fields) */
export function ptToTwips(pt: number): number {
    return Math.round(pt * TWIPS_PER_PT);
}

/** pt → CSS px at 96 dpi */
export function ptToPx(pt: number): number {
    return Math.round((pt * DPI) / PT_PER_INCH);
}

/** CSS unitless line-height multiplier → 240ths of a line (DOCX line spacing) */
export function lineHeightTo240ths(multiplier: number): number {
    return Math.round(multiplier * LINE_HEIGHT_240THS);
}
