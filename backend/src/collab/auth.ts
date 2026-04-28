import { auth } from '../auth/betterAuth.js';
import { db } from '../db/client.js';
import { assignment, book } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';
import type { Role } from '../lib/permissions.js';
import { mergePermissions } from '../lib/permissions.js';
import { env } from '../env.js';

export interface CollabContext {
    user: any;
    roles: Role[];
    readOnly: boolean;
}

export async function authenticate(data: {
    documentName: string;
    requestHeaders: Record<string, string | string[] | undefined>;
}): Promise<CollabContext> {
    const origin = data.requestHeaders.origin;
    if (typeof origin === 'string' && !env.CORS_ORIGINS.includes(origin)) {
        throw new Error('forbidden: origin');
    }
    const headers = new Headers();
    for (const [k, v] of Object.entries(data.requestHeaders)) {
        if (typeof v === 'string') headers.set(k, v);
        else if (Array.isArray(v)) headers.set(k, v.join(', '));
    }
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error('unauthenticated');
    const u: any = session.user;

    if (!data.documentName.startsWith('book:')) throw new Error('bad document name');
    const bookId = data.documentName.slice('book:'.length);
    const [b] = await db.select().from(book).where(eq(book.id, bookId));
    if (!b) throw new Error('book not found');

    if (u.isAdmin || b.createdById === u.id) {
        return { user: u, roles: ['editor'], readOnly: false };
    }

    const rows = await db.select().from(assignment)
        .where(and(eq(assignment.bookId, bookId), eq(assignment.userId, u.id)));
    if (rows.length === 0) throw new Error('forbidden');

    const roles = rows.map((r) => r.role as Role);
    const merged = mergePermissions(roles);
    const readOnly = !merged.canEdit && !merged.canSuggest;
    return { user: u, roles, readOnly };
}
