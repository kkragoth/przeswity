import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
    constructor(
        public code: string,
        public status: number,
        message: string,
    ) {
        super(message);
    }
}

export const asyncHandler = (fn: any) =>
    (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) {
        res.status(400).json({ error: { code: 'errors.validation', message: err.message, issues: err.issues } });
        return;
    }
    if (err instanceof AppError) {
        res.status(err.status).json({ error: { code: err.code, message: err.message } });
        return;
    }
    console.error('unhandled', err);
    res.status(500).json({ error: { code: 'errors.internal', message: 'internal error' } });
};
