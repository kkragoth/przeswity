import rateLimit from 'express-rate-limit';

// Limits are sized as runaway-protection, not anti-abuse. A real client (incl. a tab
// with HMR, StrictMode and bursty pollers) won't get near these; a script gone wild will.
export const authLimiter = rateLimit({
    windowMs: 60_000,
    max: 10_000,
    standardHeaders: true,
    legacyHeaders: false,
});

export const pdfLimiter = rateLimit({
    windowMs: 60_000,
    max: 10_000,
    standardHeaders: true,
    legacyHeaders: false,
});

export const defaultLimiter = rateLimit({
    windowMs: 60_000,
    max: 250_000,
    standardHeaders: true,
    legacyHeaders: false,
});
