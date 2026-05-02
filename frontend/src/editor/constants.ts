// Collaboration / network
export const RECONNECT_RETRY_INTERVAL_MS = 2_000;
export const AWARENESS_ACTIVITY_THROTTLE_MS = 250;

// Versions
export const VERSIONS_AUTO_KEEP = 8;
export const VERSIONS_PERSIST_DEBOUNCE_MS = 250;

// UI timings
export const HEADING_PULSE_MS = 1_400;
export const TOAST_DURATION_MS = 3_000;

// Block drag-and-drop
/** Fraction of block height that determines drop-above vs drop-below. */
export const BLOCK_DROP_MIDPOINT_RATIO = 0.5;

// Comment pins
export const COMMENT_PIN_GAP_PX = 36;

// Page navigation
export const PAGE_NAV_ACTIVE_LINE_RATIO = 0.30;
export const PAGE_NAV_TOP_OFFSET_PX = 16;

// A4 page dimensions at 96 dpi (editor canvas).
// Content width = 794 − 96 − 96 = 602 px (matches --editor-measure CSS token).
export const A4_PAGE_HEIGHT_PX = 1123;
export const A4_PAGE_WIDTH_PX = 794;
export const A4_MARGIN_PX = 96;

// Page gap colours (PaginationPlus extension)
export const PAGE_GAP_BORDER_COLOR = '#d4cfc9';
export const PAGE_BREAK_BACKGROUND = '#f0ede8';
