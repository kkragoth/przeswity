import type { Request, Response, NextFunction } from 'express';
import { auth } from './betterAuth.js';
import { fromNodeHeaders } from 'better-auth/node';
import { SystemRole } from '../db/auth-schema.js';

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
