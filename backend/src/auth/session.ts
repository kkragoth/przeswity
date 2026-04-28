import type { Request, Response, NextFunction } from 'express';
import { auth } from './betterAuth.js';
import { fromNodeHeaders } from 'better-auth/node';

export type AuthUser = {
    id: string;
    email: string;
    name: string;
    isAdmin: boolean;
    isCoordinator: boolean;
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
    if (!req.user?.isAdmin) {
        res.status(403).json({ error: { code: 'errors.auth.forbidden', message: 'admin only' } });
        return;
    }
    next();
}
