import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { bookYjsState, bookSnapshot } from '../../db/schema.js';
import { requireSession, requireProjectManager, requireAdmin, authedHandler } from '../../auth/session.js';
import { isAdmin } from '../../lib/permissions.js';
import { AppError } from '../../lib/errors.js';
import { CreateBookBody, UpdateBookBody, PatchBookStageBody, PatchBookProgressBody } from './schemas.js';
import { yDocStateToMarkdown } from '@przeswity/editor-schema/markdown';
import {
    listVisibleBooks, listAssigneeCounts, listMyRolesByBook, projectBook,
    createBookWithSeed, updateBookFields, transitionStage, updateProgress,
    getStageHistory, loadBookOrThrow,
} from './service.js';
import { assertCanEditBook, assertCanManageStageOrProgress, assertValidStageTransition } from './policy.js';
import { getPresence } from '../../collab/presence.js';
import { env } from '../../env.js';
import { loadBookAccess, requireBookAccess } from '../../lib/access.js';
import { book } from '../../db/schema.js';
import './openapi.js';

export const booksRouter = Router();

booksRouter.get('/api/books', requireSession, authedHandler(async (req, res) => {
    const me = req.user;
    const myRolesByBook = await listMyRolesByBook(me.id);
    const books = await listVisibleBooks(me.id, isAdmin(me.systemRole));
    const counts = await listAssigneeCounts(books.map((b) => b.id));
    res.json(books.map((b) => ({
        ...projectBook(b),
        myRoles: myRolesByBook.get(b.id) ?? [],
        assigneeCount: counts.get(b.id) ?? 0,
    })));
}));

booksRouter.get('/api/books/:id', requireSession, authedHandler(async (req, res) => {
    const access = await loadBookAccess(req.params.id, req.user);
    requireBookAccess(access);
    res.json(projectBook(access.book));
}));

booksRouter.post('/api/books', requireSession, requireProjectManager, authedHandler(async (req, res) => {
    const body = CreateBookBody.parse(req.body);
    const created = await createBookWithSeed(req.user, body);
    res.json(projectBook(created));
}));

booksRouter.patch('/api/books/:id', requireSession, authedHandler(async (req, res) => {
    const me = req.user;
    const body = UpdateBookBody.parse(req.body);
    const existing = await loadBookOrThrow(req.params.id);
    const { admin } = assertCanEditBook(existing.createdById, me);
    const updated = await updateBookFields(req.params.id, me, admin, body);
    res.json(projectBook(updated));
}));

booksRouter.patch('/api/books/:id/stage', requireSession, authedHandler(async (req, res) => {
    const me = req.user;
    assertCanManageStageOrProgress(me);
    const body = PatchBookStageBody.parse(req.body);
    const existing = await loadBookOrThrow(req.params.id);
    const { from } = assertValidStageTransition(existing.stage, body.stage);
    const updated = await transitionStage(req.params.id, me, from, body, existing.stageDueAt);
    res.json(projectBook(updated));
}));

booksRouter.patch('/api/books/:id/progress', requireSession, authedHandler(async (req, res) => {
    const me = req.user;
    assertCanManageStageOrProgress(me);
    const body = PatchBookProgressBody.parse(req.body);
    await loadBookOrThrow(req.params.id);
    const updated = await updateProgress(req.params.id, me, body);
    res.json(projectBook(updated));
}));

booksRouter.get('/api/books/:id/stage-history', requireSession, authedHandler(async (req, res) => {
    const access = await loadBookAccess(req.params.id, req.user);
    requireBookAccess(access);
    res.json(await getStageHistory(req.params.id));
}));

booksRouter.delete('/api/books/:id', requireSession, requireAdmin, authedHandler(async (req, res) => {
    const deleted = await db.delete(book).where(eq(book.id, req.params.id)).returning({ id: book.id });
    if (deleted.length === 0) throw new AppError('errors.book.notFound', 404, 'not found');
    res.status(204).end();
}));

booksRouter.get('/api/books/:id/markdown', requireSession, authedHandler(async (req, res) => {
    const access = await loadBookAccess(req.params.id, req.user);
    requireBookAccess(access);
    const [state] = await db.select().from(bookYjsState).where(eq(bookYjsState.bookId, req.params.id));
    res.set('Content-Type', 'text/markdown; charset=utf-8');
    if (!state) {
        res.send(access.book.initialMarkdown ?? '');
        return;
    }
    res.send(yDocStateToMarkdown(new Uint8Array(state.state)));
}));

booksRouter.get('/api/books/:id/snapshots/:snapId/markdown', requireSession, authedHandler(async (req, res) => {
    const access = await loadBookAccess(req.params.id, req.user);
    requireBookAccess(access);
    const [snap] = await db.select().from(bookSnapshot)
        .where(and(eq(bookSnapshot.id, req.params.snapId), eq(bookSnapshot.bookId, req.params.id)));
    if (!snap) throw new AppError('errors.snapshot.notFound', 404, 'snapshot not found');
    res.set('Content-Type', 'text/markdown; charset=utf-8');
    res.send(yDocStateToMarkdown(new Uint8Array(snap.state)));
}));

booksRouter.get('/api/books/:id/presence', requireSession, authedHandler(async (req, res) => {
    if (!env.PRESENCE_API_ENABLED) throw new AppError('errors.presence.disabled', 501, 'presence api disabled');
    const access = await loadBookAccess(req.params.id, req.user);
    requireBookAccess(access);
    res.json({ users: getPresence(req.params.id) });
}));
