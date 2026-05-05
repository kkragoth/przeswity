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

// Comment pins — minimum vertical distance between two stacked pins so they
// don't visually collide. Cards are taller than avatars, so they need a
// bigger gap; the consumer picks based on `PinsMode`.
export const COMMENT_PIN_AVATAR_GAP_PX = 36;
export const COMMENT_PIN_CARD_GAP_PX = 84;

// Page navigation
export const PAGE_NAV_ACTIVE_LINE_RATIO = 0.30;
export const PAGE_NAV_TOP_OFFSET_PX = 16;

