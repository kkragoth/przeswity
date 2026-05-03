import { AppError } from '../../lib/errors.js';
import { isAdmin } from '../../lib/permissions.js';
import type { BookAccess } from '../../lib/access.js';
import type { AuthUser } from '../../auth/session.js';

type VisibleAccess = Extract<BookAccess, { kind: 'visible' }>;

export function assertCanComment(access: VisibleAccess): void {
    if (!access.permissions.canComment) throw new AppError('errors.comment.forbidden', 403, 'cannot comment');
}

export function assertCanResolve(access: VisibleAccess): void {
    if (!access.permissions.canResolve) throw new AppError('errors.comment.forbidden', 403, 'cannot resolve');
}

export function assertCanEditMessage(authorId: string, me: AuthUser): void {
    if (authorId !== me.id) throw new AppError('errors.comment.forbidden', 403, 'not your message');
}

export function assertCanDeleteMessage(authorId: string, me: AuthUser): void {
    if (authorId !== me.id && !isAdmin(me.systemRole)) {
        throw new AppError('errors.comment.forbidden', 403, 'forbidden');
    }
}

// Thread deletion is owner/admin only — kept outside Permissions so the role matrix
// can't silently grant deletion to translators etc. via a future permissions edit.
export function assertCanDeleteThread(access: VisibleAccess): void {
    if (!access.isAdmin && !access.isOwner) {
        throw new AppError('errors.comment.forbidden', 403, 'only book owner or admin can delete threads');
    }
}
