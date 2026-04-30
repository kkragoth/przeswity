import { env } from '../env.js';

// Minimal structured logger. JSON-line output in non-development environments so log
// aggregators can parse it; pretty-printed in dev for readability. No external deps.

type Level = 'info' | 'warn' | 'error';

const emit = (level: Level, msg: string, meta?: unknown) => {
    if (env.NODE_ENV === 'development') {
        const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
        meta === undefined ? fn(`[${level}] ${msg}`) : fn(`[${level}] ${msg}`, meta);
        return;
    }
    const line = JSON.stringify({ level, msg, time: new Date().toISOString(), ...(meta ? { meta } : {}) });
    (level === 'error' ? process.stderr : process.stdout).write(line + '\n');
};

export const log = {
    info: (msg: string, meta?: unknown) => emit('info', msg, meta),
    warn: (msg: string, meta?: unknown) => emit('warn', msg, meta),
    error: (msg: string, meta?: unknown) => emit('error', msg, meta),
};
