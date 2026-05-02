// Thresholds for book activity / timeline display (days).
export const STALE_THRESHOLD_DAYS = 14;
export const RECENT_THRESHOLD_DAYS = 2;
export const TIMELINE_HORIZON_DAYS = 30;
export const ACTIVE_WEEK_DAYS = 7;

// Sentinel returned by daysSince when the date is missing/null.
// Also re-exported from lib/dates for back-compat.
export const MISSING_DATE_DAYS = 999;
