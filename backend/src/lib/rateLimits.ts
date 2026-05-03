import rateLimit from 'express-rate-limit';

// 5 auth attempts per minute per IP — covers /api/auth and dev sign-in. Aggressive
// because brute-force on signin is the highest-value target.
export const authLimiter = rateLimit({
    windowMs: 60_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
});

// 10 PDF uploads per minute per IP. PDF parse is CPU-bound; keep this tight even with
// disk storage so a single client can't pin a worker.
export const pdfLimiter = rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
});

// 200 requests per minute per IP — anything not under a stricter limiter falls here.
export const defaultLimiter = rateLimit({
    windowMs: 60_000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
});
