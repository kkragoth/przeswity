import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ErrorCode, type ErrorCodeValue } from './errorCodes.js';
import { log } from './log.js';

// `details` is for operator/incident context only — it's logged but never serialised
// into the response body, so we can include identifiers (threadId, bookId, userId)
// without leaking them to clients beyond what the route already exposes.
export class AppError extends Error {
    constructor(
        public code: ErrorCodeValue | string,
        public status: number,
        message: string,
        public details?: Record<string, unknown>,
    ) {
        super(message);
    }
}

// Generic over the handler's request/response types so call sites that annotate
// `req` keep their type info instead of seeing the second `res` param fall back to any.
type Handler<Req extends Request = Request, Res extends Response = Response> = (
    req: Req,
    res: Res,
    next: NextFunction,
) => unknown | Promise<unknown>;

export const asyncHandler = <Req extends Request = Request, Res extends Response = Response>(
    fn: Handler<Req, Res>,
) => (req: Req, res: Res, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

export const errorMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
    const path = `${req.method} ${req.originalUrl ?? req.url}`;
    if (err instanceof ZodError) {
        log.info('validation failed', { path, issues: err.issues.map((i) => ({ path: i.path, code: i.code })) });
        res.status(400).json({ error: { code: ErrorCode.Validation, message: err.message, issues: err.issues } });
        return;
    }
    if (err instanceof AppError) {
        log.debug('app error', { path, code: err.code, status: err.status, details: err.details });
        res.status(err.status).json({ error: { code: err.code, message: err.message } });
        return;
    }
    log.error('unhandled', { path, err: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err });
    res.status(500).json({ error: { code: ErrorCode.Internal, message: 'internal error' } });
};
