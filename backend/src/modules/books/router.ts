import { Router } from 'express';
import { z } from 'zod';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { book, assignment, bookYjsState, bookSnapshot, user } from '../../db/schema.js';
import { requireSession, requireCoordinator, requireAdmin } from '../../auth/session.js';
import { asyncHandler, AppError } from '../../lib/errors.js';
import { registry } from '../../openapi/registry.js';
import { BookDto, BookSummaryDto, CreateBookBody, UpdateBookBody } from './schemas.js';
import { markdownToYDocState, yDocStateToMarkdown } from '@przeswity/editor-schema/markdown';
import { listVisibleBooks, getBookIfVisible, projectBook } from './service.js';

export const booksRouter = Router();

registry.registerPath({
    method: 'get', path: '/api/books',
    operationId: 'booksList',
    responses: { 200: { description: 'list', content: { 'application/json': { schema: z.array(BookSummaryDto) } } } },
});
registry.registerPath({
    method: 'get', path: '/api/books/{id}',
    operationId: 'bookGet',
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: { description: 'book', content: { 'application/json': { schema: BookDto } } } },
});
registry.registerPath({
    method: 'post', path: '/api/books',
    operationId: 'bookCreate',
    request: { body: { content: { 'application/json': { schema: CreateBookBody } } } },
    responses: { 200: { description: 'created', content: { 'application/json': { schema: BookDto } } } },
});
registry.registerPath({
    method: 'patch', path: '/api/books/{id}',
    operationId: 'bookPatch',
    request: { params: z.object({ id: z.string() }), body: { content: { 'application/json': { schema: UpdateBookBody } } } },
    responses: { 200: { description: 'updated', content: { 'application/json': { schema: BookDto } } } },
});
registry.registerPath({
    method: 'delete', path: '/api/books/{id}',
    operationId: 'bookDelete',
    request: { params: z.object({ id: z.string() }) },
    responses: { 204: { description: 'deleted' } },
});
registry.registerPath({
    method: 'get', path: '/api/books/{id}/markdown',
    operationId: 'bookMarkdown',
    request: { params: z.object({ id: z.string() }) },
    responses: { 200: { description: 'canonical markdown', content: { 'text/markdown': { schema: z.string() } } } },
});
registry.registerPath({
    method: 'get', path: '/api/books/{id}/snapshots/{snapId}/markdown',
    operationId: 'bookSnapshotMarkdown',
    request: { params: z.object({ id: z.string(), snapId: z.string() }) },
    responses: { 200: { description: 'snapshot markdown', content: { 'text/markdown': { schema: z.string() } } } },
});

booksRouter.get('/api/books', requireSession, asyncHandler(async (req: any, res: any) => {
    const me = req.user;
    const myAssignmentRows = await db.select({ bookId: assignment.bookId, role: assignment.role })
        .from(assignment).where(eq(assignment.userId, me.id));
    const myRolesByBook = new Map<string, string[]>();
    for (const r of myAssignmentRows) {
        myRolesByBook.set(r.bookId, [...(myRolesByBook.get(r.bookId) ?? []), r.role]);
    }
    const books = await listVisibleBooks(me.id, !!me.isAdmin);
    const ids = books.map((b) => b.id);
    const counts = new Map<string, number>();
    if (ids.length > 0) {
        const rows = await db.select({ bookId: assignment.bookId, userId: assignment.userId })
            .from(assignment).where(inArray(assignment.bookId, ids));
        const distinct = new Map<string, Set<string>>();
        for (const r of rows) {
            if (!distinct.has(r.bookId)) distinct.set(r.bookId, new Set());
            distinct.get(r.bookId)!.add(r.userId);
        }
        for (const [k, v] of distinct) counts.set(k, v.size);
    }
    res.json(books.map((b) => ({
        ...projectBook(b),
        myRoles: myRolesByBook.get(b.id) ?? [],
        assigneeCount: counts.get(b.id) ?? 0,
    })));
}));

booksRouter.get('/api/books/:id', requireSession, asyncHandler(async (req: any, res: any) => {
    const me = req.user;
    const b = await getBookIfVisible(req.params.id, me.id, !!me.isAdmin);
    if (!b) {
        const [exists] = await db.select({ id: book.id }).from(book).where(eq(book.id, req.params.id));
        if (!exists) throw new AppError('errors.book.notFound', 404, 'book not found');
        throw new AppError('errors.book.forbidden', 403, 'no access');
    }
    res.json(projectBook(b));
}));

booksRouter.post('/api/books', requireSession, requireCoordinator, asyncHandler(async (req: any, res: any) => {
    const body = CreateBookBody.parse(req.body);
    const me = req.user;
    const userIds = [...new Set(body.initialAssignments.map((a) => a.userId))];
    if (userIds.length > 0) {
        const found = await db.select({ id: user.id }).from(user).where(inArray(user.id, userIds));
        const foundSet = new Set(found.map((u) => u.id));
        const unknown = userIds.filter((id) => !foundSet.has(id));
        if (unknown.length) throw new AppError('errors.assignment.unknownUsers', 422, `unknown users: ${unknown.join(',')}`);
    }
    let yState: Uint8Array | null = null;
    if (body.initialMarkdown.trim().length > 0) {
        yState = markdownToYDocState(body.initialMarkdown);
    }
    const created = await db.transaction(async (tx) => {
        const [b] = await tx.insert(book).values({
            title: body.title,
            description: body.description,
            createdById: me.id,
            initialMarkdown: body.initialMarkdown,
        }).returning();
        if (yState) {
            await tx.insert(bookYjsState).values({ bookId: b.id, state: Buffer.from(yState) as unknown as Uint8Array });
        }
        if (body.initialAssignments.length > 0) {
            const seen = new Set<string>();
            const rows = body.initialAssignments.filter((a) => {
                const k = a.userId + ':' + a.role;
                if (seen.has(k)) return false;
                seen.add(k);
                return true;
            }).map((a) => ({ bookId: b.id, userId: a.userId, role: a.role }));
            await tx.insert(assignment).values(rows).onConflictDoNothing();
        }
        return b;
    });
    res.json(projectBook(created));
}));

booksRouter.patch('/api/books/:id', requireSession, asyncHandler(async (req: any, res: any) => {
    const me = req.user;
    const body = UpdateBookBody.parse(req.body);
    const [existing] = await db.select().from(book).where(eq(book.id, req.params.id));
    if (!existing) throw new AppError('errors.book.notFound', 404, 'book not found');
    if (!me.isAdmin && existing.createdById !== me.id) {
        throw new AppError('errors.book.forbidden', 403, 'forbidden');
    }
    const update: Partial<typeof book.$inferInsert> = { updatedAt: new Date() };
    if (body.title !== undefined) update.title = body.title;
    if (body.description !== undefined) update.description = body.description;
    const [updated] = await db.update(book).set(update).where(eq(book.id, req.params.id)).returning();
    res.json(projectBook(updated));
}));

booksRouter.delete('/api/books/:id', requireSession, requireAdmin, asyncHandler(async (req: any, res: any) => {
    const deleted = await db.delete(book).where(eq(book.id, req.params.id)).returning({ id: book.id });
    if (deleted.length === 0) throw new AppError('errors.book.notFound', 404, 'not found');
    res.status(204).end();
}));

booksRouter.get('/api/books/:id/markdown', requireSession, asyncHandler(async (req: any, res: any) => {
    const me = req.user;
    const b = await getBookIfVisible(req.params.id, me.id, !!me.isAdmin);
    if (!b) {
        const [exists] = await db.select({ id: book.id }).from(book).where(eq(book.id, req.params.id));
        if (!exists) throw new AppError('errors.book.notFound', 404, 'book not found');
        throw new AppError('errors.book.forbidden', 403, 'no access');
    }
    const [state] = await db.select().from(bookYjsState).where(eq(bookYjsState.bookId, req.params.id));
    res.set('Content-Type', 'text/markdown; charset=utf-8');
    if (!state) {
        res.send(b.initialMarkdown ?? '');
        return;
    }
    res.send(yDocStateToMarkdown(new Uint8Array(state.state)));
}));

booksRouter.get('/api/books/:id/snapshots/:snapId/markdown', requireSession, asyncHandler(async (req: any, res: any) => {
    const me = req.user;
    const b = await getBookIfVisible(req.params.id, me.id, !!me.isAdmin);
    if (!b) {
        const [exists] = await db.select({ id: book.id }).from(book).where(eq(book.id, req.params.id));
        if (!exists) throw new AppError('errors.book.notFound', 404, 'book not found');
        throw new AppError('errors.book.forbidden', 403, 'no access');
    }
    const [snap] = await db.select().from(bookSnapshot)
        .where(and(eq(bookSnapshot.id, req.params.snapId), eq(bookSnapshot.bookId, req.params.id)));
    if (!snap) throw new AppError('errors.snapshot.notFound', 404, 'snapshot not found');
    res.set('Content-Type', 'text/markdown; charset=utf-8');
    res.send(yDocStateToMarkdown(new Uint8Array(snap.state)));
}));
