import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ErrorCode, type ErrorCodeValue } from './errorCodes.js';
import { log } from './log.js';

export class AppError extends Error {
    constructor(
        public code: ErrorCodeValue | string,
        public status: number,
        message: string,
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

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) {
        res.status(400).json({ error: { code: ErrorCode.Validation, message: err.message, issues: err.issues } });
        return;
    }
    if (err instanceof AppError) {
        res.status(err.status).json({ error: { code: err.code, message: err.message } });
        return;
    }
    log.error('unhandled', err);
    res.status(500).json({ error: { code: ErrorCode.Internal, message: 'internal error' } });
};
