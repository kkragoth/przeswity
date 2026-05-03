import type { Request, RequestHandler, Response, NextFunction } from 'express';
import { auth } from './betterAuth.config.js';
import { fromNodeHeaders } from 'better-auth/node';
import { SystemRole } from '../db/auth-schema.js';
import { AppError } from '../lib/errors.js';

export type AuthUser = {
    id: string;
    email: string;
    name: string;
    systemRole: SystemRole | null;
    competencyTags: string[];
    color: string;
    preferredLocale: string;
    isSystem: boolean;
};

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: AuthUser;
            sessionId?: string;
        }
    }
}

export async function attachSession(req: Request, _res: Response, next: NextFunction) {
    try {
        const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
        if (result?.user && result.session) {
            const u = result.user as unknown as AuthUser;
            req.user = u;
            req.sessionId = result.session.id;
        }
        next();
    } catch (err) {
        next(err);
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        res.status(401).json({ error: { code: 'errors.auth.unauthenticated', message: 'unauthenticated' } });
        return;
    }
    next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (req.user?.systemRole !== SystemRole.Admin) {
        res.status(403).json({ error: { code: 'errors.auth.forbidden', message: 'admin only' } });
        return;
    }
    next();
}

export function requireProjectManager(req: Request, res: Response, next: NextFunction) {
    const role = req.user?.systemRole;
    if (role !== SystemRole.Admin && role !== SystemRole.ProjectManager) {
        res.status(403).json({ error: { code: 'errors.auth.forbidden', message: 'project manager only' } });
        return;
    }
    next();
}

// requireSession = attachSession + requireAuth in one step (convenience middleware chain)
export async function requireSession(req: Request, res: Response, next: NextFunction) {
    await attachSession(req, res, async (err?: any) => {
        if (err) return next(err);
        requireAuth(req, res, next);
    });
}

// After `requireSession` middleware runs, `req.user` is guaranteed non-null. Express's
// type system can't express that — `mustUser` asserts it explicitly so handlers stay typed.
export function mustUser(req: Request): AuthUser {
    if (!req.user) throw new AppError('errors.auth.unauthenticated', 401, 'unauthenticated');
    return req.user;
}

// Express's ParamsDictionary keys are typed `string | string[]` to model repeated keys —
// our routes never use that, so we narrow params to `Record<string, string>` to keep
// handler call sites free of casts (`req.params.bookId` reads as `string`).
export type AuthedRequest = Omit<Request, 'params' | 'user'> & {
    user: AuthUser;
    sessionId: string;
    params: Record<string, string>;
};

// Wraps a handler that depends on `requireSession` having run. Asserts `req.user` is
// present at runtime (defence-in-depth) so handlers can read `req.user.id` without `!`.
export const authedHandler = (
    fn: (req: AuthedRequest, res: Response, next: NextFunction) => unknown | Promise<unknown>,
): RequestHandler => (req, res, next) => {
    if (!req.user) return next(new AppError('errors.auth.unauthenticated', 401, 'unauthenticated'));
    Promise.resolve(fn(req as unknown as AuthedRequest, res, next)).catch(next);
};
