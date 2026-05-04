import { env } from '../env.js';

// Minimal structured logger. JSON-line output in non-development environments so log
// aggregators can parse it; pretty-printed in dev for readability. No external deps.

type Level = 'debug' | 'info' | 'warn' | 'error';

// Debug is suppressed outside development unless LOG_DEBUG=1 is set, so AppError
// noise (404s, 403s) doesn't drown out signal in prod logs.
const debugEnabled = env.NODE_ENV === 'development' || process.env.LOG_DEBUG === '1';

const emit = (level: Level, msg: string, meta?: unknown) => {
    if (level === 'debug' && !debugEnabled) return;
    if (env.NODE_ENV === 'development') {
        const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
        meta === undefined ? fn(`[${level}] ${msg}`) : fn(`[${level}] ${msg}`, meta);
        return;
    }
    const line = JSON.stringify({ level, msg, time: new Date().toISOString(), ...(meta ? { meta } : {}) });
    (level === 'error' ? process.stderr : process.stdout).write(line + '\n');
};

export const log = {
    debug: (msg: string, meta?: unknown) => emit('debug', msg, meta),
    info: (msg: string, meta?: unknown) => emit('info', msg, meta),
    warn: (msg: string, meta?: unknown) => emit('warn', msg, meta),
    error: (msg: string, meta?: unknown) => emit('error', msg, meta),
};
