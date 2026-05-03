import { AppError } from '../../lib/errors.js';
import { isAdmin, isProjectManager } from '../../lib/permissions.js';
import { canTransitionStage, isBookStage, type BookStage } from './workflow.js';
import type { AuthUser } from '../../auth/session.js';

export function assertCanEditBook(existingOwnerId: string, me: AuthUser): { admin: boolean } {
    const admin = isAdmin(me.systemRole);
    if (!admin && existingOwnerId !== me.id) {
        throw new AppError('errors.book.forbidden', 403, 'forbidden');
    }
    return { admin };
}

export function assertCanManageStageOrProgress(me: AuthUser): void {
    if (!isProjectManager(me.systemRole)) {
        throw new AppError('errors.book.forbidden', 403, 'forbidden');
    }
}

export function assertValidStageTransition(fromRaw: string, toRaw: string): { from: BookStage; to: BookStage } {
    if (!isBookStage(fromRaw) || !isBookStage(toRaw)) {
        throw new AppError('errors.book.stage.invalid', 422, 'invalid stage');
    }
    if (!canTransitionStage(fromRaw, toRaw)) {
        throw new AppError('errors.book.stage.transitionForbidden', 422, `cannot transition from ${fromRaw} to ${toRaw}`);
    }
    return { from: fromRaw, to: toRaw };
}
