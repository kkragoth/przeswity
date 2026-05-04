import { auth } from '../auth/betterAuth.config.js';
import type { Role } from '../lib/permissions.js';
import type { AuthUser } from '../auth/session.js';
import { SystemRole } from '../db/auth-schema.js';
import { env } from '../env.js';
import { log } from '../lib/log.js';
import { getBookAccessByUserId } from '../lib/access.js';

export type CollabUser = Pick<AuthUser, 'id' | 'name' | 'systemRole'> & Partial<AuthUser>;

export interface CollabContext {
    user: CollabUser;
    roles: Role[];
    readOnly: boolean;
}

export async function authenticate(data: {
    documentName: string;
    requestHeaders: Record<string, string | string[] | undefined>;
}): Promise<CollabContext> {
    const origin = data.requestHeaders.origin;
    if (typeof origin === 'string' && !env.CORS_ORIGINS.includes(origin)) {
        log.warn('collab origin rejected', { origin, allowed: env.CORS_ORIGINS });
        throw new Error('forbidden: origin');
    }
    const headers = new Headers();
    for (const [k, v] of Object.entries(data.requestHeaders)) {
        if (typeof v === 'string') headers.set(k, v);
        else if (Array.isArray(v)) headers.set(k, v.join(', '));
    }
    const session = await auth.api.getSession({ headers });
    const u = (session?.user ?? null) as (CollabUser | null);

    if (!data.documentName.startsWith('book:')) throw new Error('bad document name');
    const bookId = data.documentName.slice('book:'.length);

    if (!u) {
        if (env.ENABLE_DEV_AUTH && env.NODE_ENV !== 'production') {
            // Dev-only fallback: some WS clients/browsers may omit auth cookies.
            // Allow collaboration so seeded books/cursors are still testable locally.
            // Verify the book exists so this still 404s on unknown ids.
            const probe = await getBookAccessByUserId(bookId, null, null);
            if (probe.kind === 'notFound') throw new Error('book not found');
            return {
                user: { id: 'dev-ws-anon', name: 'Dev WS User', systemRole: SystemRole.Admin },
                roles: ['editor'],
                readOnly: false,
            };
        }
        throw new Error('unauthenticated');
    }

    const access = await getBookAccessByUserId(bookId, u.id, u.systemRole ?? null);
    if (access.kind === 'notFound') throw new Error('book not found');
    if (access.kind === 'forbidden') throw new Error('forbidden');

    // Admin and owner act as editors regardless of declared roles.
    if (access.isAdmin || access.isOwner) {
        return { user: u, roles: ['editor'], readOnly: false };
    }
    const { permissions, roles } = access;
    const readOnly = !permissions.canEdit && !permissions.canSuggest;
    return { user: u, roles, readOnly };
}
