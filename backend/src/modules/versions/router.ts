import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { book, assignment, bookSnapshot, bookYjsState, user } from '../../db/schema.js';
import { requireSession } from '../../auth/session.js';
import { asyncHandler, AppError } from '../../lib/errors.js';
import { isAdmin } from '../../lib/permissions.js';
import { registry } from '../../openapi/registry.js';
import { SnapshotSummaryDto, CreateSnapshotBody } from './schemas.js';

export const versionsRouter = Router();

registry.registerPath({
    method: 'get', path: '/api/books/{bookId}/snapshots',
    operationId: 'bookSnapshotsList',
    request: { params: z.object({ bookId: z.string() }) },
    responses: { 200: { description: 'list', content: { 'application/json': { schema: z.array(SnapshotSummaryDto) } } } },
});
registry.registerPath({
    method: 'post', path: '/api/books/{bookId}/snapshots',
    operationId: 'bookSnapshotCreate',
    request: { params: z.object({ bookId: z.string() }), body: { content: { 'application/json': { schema: CreateSnapshotBody } } } },
    responses: { 200: { description: 'created', content: { 'application/json': { schema: SnapshotSummaryDto } } } },
});
registry.registerPath({
    method: 'get', path: '/api/books/{bookId}/snapshots/{id}/state',
    operationId: 'bookSnapshotState',
    request: { params: z.object({ bookId: z.string(), id: z.string() }) },
    responses: { 200: { description: 'raw yjs state' } },
});
registry.registerPath({
    method: 'delete', path: '/api/books/{bookId}/snapshots/{id}',
    operationId: 'bookSnapshotDelete',
    request: { params: z.object({ bookId: z.string(), id: z.string() }) },
    responses: { 204: { description: 'deleted' } },
});

async function visibilityCheck(bookId: string, me: any) {
    if (isAdmin(me.systemRole)) return { book: null, isOwner: false, roles: [] as string[] };
    const [b] = await db.select().from(book).where(eq(book.id, bookId));
    if (!b) throw new AppError('errors.book.notFound', 404, 'book not found');
    if (b.createdById === me.id) return { book: b, isOwner: true, roles: [] as string[] };
    const ass = await db.select().from(assignment).where(and(eq(assignment.bookId, bookId), eq(assignment.userId, me.id)));
    if (ass.length === 0) throw new AppError('errors.book.forbidden', 403, 'no access');
    return { book: b, isOwner: false, roles: ass.map((a) => a.role) };
}

versionsRouter.get('/api/books/:bookId/snapshots', requireSession, asyncHandler(async (req: any, res: any) => {
    await visibilityCheck(req.params.bookId, req.user);
    const rows = await db.select({
        s: bookSnapshot,
        u: { id: user.id, name: user.name, email: user.email, color: user.color, image: user.image },
    }).from(bookSnapshot).innerJoin(user, eq(user.id, bookSnapshot.createdById))
      .where(eq(bookSnapshot.bookId, req.params.bookId))
      .orderBy(desc(bookSnapshot.createdAt));
    res.json(rows.map((r: any) => ({
        id: r.s.id, bookId: r.s.bookId, label: r.s.label,
        createdById: r.s.createdById, createdAt: new Date(r.s.createdAt).toISOString(),
        createdBy: r.u,
    })));
}));

versionsRouter.post('/api/books/:bookId/snapshots', requireSession, asyncHandler(async (req: any, res: any) => {
    const { isOwner, roles } = await visibilityCheck(req.params.bookId, req.user);
    const allowedRoles = new Set(['editor', 'proofreader', 'translator', 'author', 'typesetter', 'coordinator']);
    const canCreate = isAdmin(req.user.systemRole) || isOwner || roles.some((r: string) => allowedRoles.has(r));
    if (!canCreate) throw new AppError('errors.book.forbidden', 403, 'forbidden');
    const body = CreateSnapshotBody.parse(req.body);
    const [yState] = await db.select().from(bookYjsState).where(eq(bookYjsState.bookId, req.params.bookId));
    const stateBytes = yState ? yState.state : Buffer.alloc(0);
    const [snap] = await db.insert(bookSnapshot).values({
        bookId: req.params.bookId,
        label: body.label,
        state: stateBytes as any,
        createdById: req.user.id,
    }).returning();
    const [u] = await db.select({ id: user.id, name: user.name, email: user.email, color: user.color, image: user.image })
        .from(user).where(eq(user.id, req.user.id));
    res.json({
        id: snap.id, bookId: snap.bookId, label: snap.label,
        createdById: snap.createdById, createdAt: new Date(snap.createdAt).toISOString(),
        createdBy: u,
    });
}));

versionsRouter.get('/api/books/:bookId/snapshots/:id/state', requireSession, asyncHandler(async (req: any, res: any) => {
    await visibilityCheck(req.params.bookId, req.user);
    const [snap] = await db.select().from(bookSnapshot).where(
        and(eq(bookSnapshot.id, req.params.id), eq(bookSnapshot.bookId, req.params.bookId)),
    );
    if (!snap) throw new AppError('errors.snapshot.notFound', 404, 'not found');
    res.set('Content-Type', 'application/octet-stream');
    res.send(Buffer.from(snap.state));
}));

versionsRouter.delete('/api/books/:bookId/snapshots/:id', requireSession, asyncHandler(async (req: any, res: any) => {
    const { isOwner } = await visibilityCheck(req.params.bookId, req.user);
    if (!isAdmin(req.user.systemRole) && !isOwner) throw new AppError('errors.book.forbidden', 403, 'forbidden');
    const deleted = await db.delete(bookSnapshot).where(
        and(eq(bookSnapshot.id, req.params.id), eq(bookSnapshot.bookId, req.params.bookId)),
    ).returning({ id: bookSnapshot.id });
    if (deleted.length === 0) throw new AppError('errors.snapshot.notFound', 404, 'not found');
    res.status(204).end();
}));
