import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { book, assignment } from '../db/schema.js';
import type { BookRow } from '../modules/books/service.js';
import type { BookRole, Permissions } from './permissions.js';
import { isAdmin, permissionsForUser } from './permissions.js';
import { AppError } from './errors.js';
import { ErrorCode } from './errorCodes.js';

// Discriminated union of access outcomes for a (book, user) lookup. Callers must
// branch on `kind` and pull `permissions` from the `visible` arm — never reimplement
// per-route role checks. Keep authorization decisions in this module.
export type BookAccess =
    | { kind: 'notFound' }
    | { kind: 'forbidden' }
    | {
        kind: 'visible';
        book: BookRow;
        isOwner: boolean;
        isAdmin: boolean;
        roles: BookRole[];
        permissions: Permissions;
    };

// Transport-agnostic primitive: HTTP path resolves session then delegates here, WS path
// (collab/auth.ts) calls directly with the BetterAuth user. Do NOT wrap WS in a fake
// Express Request — keep the WS auth layer independent of middleware shape.
export async function getBookAccessByUserId(
    bookId: string,
    userId: string | null,
    systemRole: string | null | undefined,
): Promise<BookAccess> {
    const [b] = await db.select().from(book).where(eq(book.id, bookId));
    if (!b) return { kind: 'notFound' };
    if (!userId) return { kind: 'forbidden' };

    const admin = isAdmin(systemRole);
    const isOwner = b.createdById === userId;

    if (admin || isOwner) {
        return {
            kind: 'visible', book: b, isOwner, isAdmin: admin, roles: [],
            permissions: permissionsForUser([], { systemRole, isOwner }),
        };
    }

    const rows = await db.select({ role: assignment.role })
        .from(assignment)
        .where(and(eq(assignment.bookId, bookId), eq(assignment.userId, userId)));
    if (rows.length === 0) return { kind: 'forbidden' };

    const roles = rows.map((r) => r.role as BookRole);
    return {
        kind: 'visible', book: b, isOwner: false, isAdmin: false, roles,
        permissions: permissionsForUser(roles, { systemRole, isOwner: false }),
    };
}

export type AuthedReqShape = { user: { id: string; systemRole?: string | null } };

export const loadBookAccess = (bookId: string, me: AuthedReqShape['user']): Promise<BookAccess> =>
    getBookAccessByUserId(bookId, me.id, me.systemRole ?? null);

// Throws the correct AppError for non-visible access. After this, callers can rely on
// `access.kind === 'visible'` via TypeScript narrowing.
export function requireBookAccess(access: BookAccess): asserts access is Extract<BookAccess, { kind: 'visible' }> {
    if (access.kind === 'notFound') throw new AppError(ErrorCode.BookNotFound, 404, 'book not found');
    if (access.kind === 'forbidden') throw new AppError(ErrorCode.BookForbidden, 403, 'no access');
}
