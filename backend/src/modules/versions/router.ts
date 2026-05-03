import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { bookSnapshot, bookYjsState, user } from '../../db/schema.js';
import { requireSession, authedHandler } from '../../auth/session.js';
import { AppError } from '../../lib/errors.js';
import { loadBookAccess, requireBookAccess } from '../../lib/access.js';
import { registry } from '../../openapi/registry.js';
import { SnapshotSummaryDto, CreateSnapshotBody } from './schemas.js';
import { asByteaInput } from '../../lib/bytes.js';
import { userPublicCols } from '../../db/projections.js';
import { toIsoOrThrow } from '../../lib/dto.js';

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

versionsRouter.get('/api/books/:bookId/snapshots', requireSession, authedHandler(async (req, res) => {
    const access = await loadBookAccess(req.params.bookId, req.user);
    requireBookAccess(access);
    const rows = await db.select({
        s: bookSnapshot,
        u: userPublicCols,
    }).from(bookSnapshot).innerJoin(user, eq(user.id, bookSnapshot.createdById))
      .where(eq(bookSnapshot.bookId, req.params.bookId))
      .orderBy(desc(bookSnapshot.createdAt));
    res.json(rows.map((r) => ({
        id: r.s.id, bookId: r.s.bookId, label: r.s.label,
        createdById: r.s.createdById, createdAt: toIsoOrThrow(r.s.createdAt),
        createdBy: r.u,
    })));
}));

versionsRouter.post('/api/books/:bookId/snapshots', requireSession, authedHandler(async (req, res) => {
    const access = await loadBookAccess(req.params.bookId, req.user);
    requireBookAccess(access);
    // Snapshot-create is "any assignee or higher" — not a role-matrix question. Owner +
    // admin already pass via `isOwner`/`isAdmin`; assignees pass via `roles.length > 0`.
    const canCreate = access.isAdmin || access.isOwner || access.roles.length > 0;
    if (!canCreate) throw new AppError('errors.book.forbidden', 403, 'forbidden');
    const body = CreateSnapshotBody.parse(req.body);
    const [yState] = await db.select().from(bookYjsState).where(eq(bookYjsState.bookId, req.params.bookId));
    const stateBytes = yState ? yState.state : Buffer.alloc(0);
    const [snap] = await db.insert(bookSnapshot).values({
        bookId: req.params.bookId,
        label: body.label,
        state: asByteaInput(stateBytes instanceof Uint8Array ? stateBytes : new Uint8Array(stateBytes)),
        createdById: req.user.id,
    }).returning();
    const [u] = await db.select(userPublicCols).from(user).where(eq(user.id, req.user.id));
    res.json({
        id: snap.id, bookId: snap.bookId, label: snap.label,
        createdById: snap.createdById, createdAt: toIsoOrThrow(snap.createdAt),
        createdBy: u,
    });
}));

versionsRouter.get('/api/books/:bookId/snapshots/:id/state', requireSession, authedHandler(async (req, res) => {
    const access = await loadBookAccess(req.params.bookId, req.user);
    requireBookAccess(access);
    const [snap] = await db.select().from(bookSnapshot).where(
        and(eq(bookSnapshot.id, req.params.id), eq(bookSnapshot.bookId, req.params.bookId)),
    );
    if (!snap) throw new AppError('errors.snapshot.notFound', 404, 'not found');
    res.set('Content-Type', 'application/octet-stream');
    res.send(Buffer.from(snap.state));
}));

versionsRouter.delete('/api/books/:bookId/snapshots/:id', requireSession, authedHandler(async (req, res) => {
    const access = await loadBookAccess(req.params.bookId, req.user);
    requireBookAccess(access);
    if (!access.isAdmin && !access.isOwner) throw new AppError('errors.book.forbidden', 403, 'forbidden');
    const deleted = await db.delete(bookSnapshot).where(
        and(eq(bookSnapshot.id, req.params.id), eq(bookSnapshot.bookId, req.params.bookId)),
    ).returning({ id: bookSnapshot.id });
    if (deleted.length === 0) throw new AppError('errors.snapshot.notFound', 404, 'not found');
    res.status(204).end();
}));
