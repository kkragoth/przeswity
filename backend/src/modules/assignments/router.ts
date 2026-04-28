import { Router } from 'express';
import { z } from 'zod';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { book, assignment, user } from '../../db/schema.js';
import { requireSession } from '../../auth/session.js';
import { asyncHandler, AppError } from '../../lib/errors.js';
import { isAdmin } from '../../lib/permissions.js';
import { registry } from '../../openapi/registry.js';
import {
    AssignmentDto,
    AssignmentWithUserDto,
    CreateAssignmentBody,
    BulkCreateAssignmentsBody,
    BulkAssignmentResponse,
} from './schemas.js';

export const assignmentsRouter = Router();

registry.registerPath({
    method: 'get', path: '/api/books/{bookId}/assignments',
    operationId: 'bookAssignmentsList',
    request: { params: z.object({ bookId: z.string() }) },
    responses: { 200: { description: 'list', content: { 'application/json': { schema: z.array(AssignmentWithUserDto) } } } },
});
registry.registerPath({
    method: 'post', path: '/api/books/{bookId}/assignments',
    operationId: 'bookAssignmentCreate',
    request: { params: z.object({ bookId: z.string() }), body: { content: { 'application/json': { schema: CreateAssignmentBody } } } },
    responses: { 200: { description: 'created', content: { 'application/json': { schema: AssignmentDto } } } },
});
registry.registerPath({
    method: 'post', path: '/api/books/{bookId}/assignments/bulk',
    operationId: 'bookAssignmentsBulkCreate',
    request: { params: z.object({ bookId: z.string() }), body: { content: { 'application/json': { schema: BulkCreateAssignmentsBody } } } },
    responses: { 200: { description: 'bulk result', content: { 'application/json': { schema: BulkAssignmentResponse } } } },
});
registry.registerPath({
    method: 'delete', path: '/api/books/{bookId}/assignments/{userId}/{role}',
    operationId: 'bookAssignmentDelete',
    request: { params: z.object({ bookId: z.string(), userId: z.string(), role: z.string() }) },
    responses: { 204: { description: 'deleted' } },
});

const projectAssignment = (a: any) => ({
    bookId: a.bookId,
    userId: a.userId,
    role: a.role,
    createdAt: new Date(a.createdAt).toISOString(),
});

async function loadBook(bookId: string) {
    const [b] = await db.select().from(book).where(eq(book.id, bookId));
    if (!b) throw new AppError('errors.book.notFound', 404, 'book not found');
    return b;
}

async function isVisibleToUser(bookId: string, me: any) {
    if (isAdmin(me.systemRole)) return true;
    const [b] = await db.select().from(book).where(eq(book.id, bookId));
    if (!b) return false;
    if (b.createdById === me.id) return true;
    const rows = await db.select().from(assignment).where(and(eq(assignment.bookId, bookId), eq(assignment.userId, me.id)));
    return rows.length > 0;
}

async function canManage(bookId: string, me: any) {
    if (isAdmin(me.systemRole)) return true;
    const [b] = await db.select().from(book).where(eq(book.id, bookId));
    if (!b) return false;
    return b.createdById === me.id;
}

assignmentsRouter.get('/api/books/:bookId/assignments', requireSession, asyncHandler(async (req: any, res) => {
    const me = req.user;
    if (!(await isVisibleToUser(req.params.bookId, me))) {
        throw new AppError('errors.book.forbidden', 403, 'no access');
    }
    await loadBook(req.params.bookId);
    const rows = await db.select({
        a: assignment,
        u: { id: user.id, email: user.email, name: user.name, color: user.color, image: user.image },
    }).from(assignment).innerJoin(user, eq(user.id, assignment.userId))
        .where(eq(assignment.bookId, req.params.bookId));
    res.json(rows.map((r: any) => ({ ...projectAssignment(r.a), user: r.u })));
}));

assignmentsRouter.post('/api/books/:bookId/assignments', requireSession, asyncHandler(async (req: any, res) => {
    const me = req.user;
    if (!(await canManage(req.params.bookId, me))) throw new AppError('errors.book.forbidden', 403, 'forbidden');
    const body = CreateAssignmentBody.parse(req.body);
    const [u] = await db.select().from(user).where(eq(user.id, body.userId));
    if (!u) throw new AppError('errors.assignment.unknownUsers', 422, 'unknown user');
    const [a] = await db.insert(assignment).values({ bookId: req.params.bookId, userId: body.userId, role: body.role })
        .onConflictDoNothing().returning();
    if (!a) {
        const [existing] = await db.select().from(assignment).where(and(
            eq(assignment.bookId, req.params.bookId),
            eq(assignment.userId, body.userId),
            eq(assignment.role, body.role),
        ));
        return res.json(projectAssignment(existing));
    }
    res.json(projectAssignment(a));
}));

assignmentsRouter.post('/api/books/:bookId/assignments/bulk', requireSession, asyncHandler(async (req: any, res) => {
    const me = req.user;
    if (!(await canManage(req.params.bookId, me))) throw new AppError('errors.book.forbidden', 403, 'forbidden');
    const body = BulkCreateAssignmentsBody.parse(req.body);

    // Dedup payload by (userId, role)
    const seen = new Set<string>();
    const dedup = body.assignments.filter((a) => {
        const k = `${a.userId}:${a.role}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });

    // Pre-validate: all userIds must exist before opening a transaction
    const userIds = [...new Set(dedup.map((a) => a.userId))];
    const found = await db.select({ id: user.id }).from(user).where(inArray(user.id, userIds));
    const foundSet = new Set(found.map((u) => u.id));
    const unknown = userIds.filter((id) => !foundSet.has(id));
    if (unknown.length > 0) {
        return res.status(422).json({ error: { code: 'errors.assignment.unknownUsers', message: 'unknown users', unknownUserIds: unknown } });
    }

    const result = await db.transaction(async (tx) => {
        const existingRows = await tx.select().from(assignment).where(and(
            eq(assignment.bookId, req.params.bookId),
            inArray(assignment.userId, userIds),
        ));
        const existingKeys = new Set(existingRows.map((r) => `${r.userId}:${r.role}`));
        const toInsert = dedup
            .filter((a) => !existingKeys.has(`${a.userId}:${a.role}`))
            .map((a) => ({ bookId: req.params.bookId, userId: a.userId, role: a.role }));

        let created: any[] = [];
        if (toInsert.length > 0) {
            created = await tx.insert(assignment).values(toInsert).onConflictDoNothing().returning();
        }
        const existing = existingRows.filter((r) => dedup.some((a) => a.userId === r.userId && a.role === r.role));
        const allRows = await tx.select().from(assignment).where(eq(assignment.bookId, req.params.bookId));
        return { created, existing, all: allRows };
    });

    res.json({
        created: result.created.map(projectAssignment),
        existing: result.existing.map(projectAssignment),
        assignments: result.all.map(projectAssignment),
    });
}));

assignmentsRouter.delete('/api/books/:bookId/assignments/:userId/:role', requireSession, asyncHandler(async (req: any, res) => {
    const me = req.user;
    if (!(await canManage(req.params.bookId, me))) throw new AppError('errors.book.forbidden', 403, 'forbidden');
    const deleted = await db.delete(assignment).where(and(
        eq(assignment.bookId, req.params.bookId),
        eq(assignment.userId, req.params.userId),
        eq(assignment.role, req.params.role),
    )).returning({ bookId: assignment.bookId });
    if (deleted.length === 0) throw new AppError('errors.assignment.notFound', 404, 'not found');
    res.status(204).end();
}));
