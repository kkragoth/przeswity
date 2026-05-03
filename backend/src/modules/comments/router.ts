import { Router } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { commentThread, commentMessage } from '../../db/schema.js';
import { requireSession, authedHandler } from '../../auth/session.js';
import { AppError } from '../../lib/errors.js';
import { loadBookAccess, requireBookAccess } from '../../lib/access.js';
import { CreateThreadBody, CreateReplyBody, EditMessageBody, ResolveBody, CommentsListQuery } from './schemas.js';
import { listThreadsForBook, loadThreadOrThrow, loadThreadWithMessages } from './service.js';
import {
    assertCanComment, assertCanResolve,
    assertCanEditMessage, assertCanDeleteMessage, assertCanDeleteThread,
} from './policy.js';
import './openapi.js';

export const commentsRouter = Router();

commentsRouter.get('/api/books/:bookId/comments', requireSession, authedHandler(async (req, res) => {
    const me = req.user;
    const access = await loadBookAccess(req.params.bookId, me);
    requireBookAccess(access);
    const query = CommentsListQuery.parse(req.query);
    res.json(await listThreadsForBook(req.params.bookId, me.id, access.roles, query));
}));

commentsRouter.post('/api/books/:bookId/comments', requireSession, authedHandler(async (req, res) => {
    const me = req.user;
    const access = await loadBookAccess(req.params.bookId, me);
    requireBookAccess(access);
    assertCanComment(access);
    const body = CreateThreadBody.parse(req.body);

    const [thread] = await db.insert(commentThread).values({
        bookId: req.params.bookId,
        anchorId: body.anchorId,
        quote: body.quote,
        createdById: me.id,
    }).returning();

    await db.insert(commentMessage).values({
        threadId: thread.id,
        authorId: me.id,
        body: body.body,
        mentions: body.mentions ?? { userIds: [], roles: [] },
    });

    res.json(await loadThreadWithMessages(thread.id));
}));

commentsRouter.post('/api/comments/:threadId/messages', requireSession, authedHandler(async (req, res) => {
    const me = req.user;
    const thread = await loadThreadOrThrow(req.params.threadId);
    const access = await loadBookAccess(thread.bookId, me);
    requireBookAccess(access);
    assertCanComment(access);
    const body = CreateReplyBody.parse(req.body);

    await db.insert(commentMessage).values({
        threadId: thread.id,
        authorId: me.id,
        body: body.body,
        mentions: body.mentions ?? { userIds: [], roles: [] },
    });

    res.json(await loadThreadWithMessages(thread.id));
}));

commentsRouter.patch('/api/comments/:threadId/messages/:messageId', requireSession, authedHandler(async (req, res) => {
    const me = req.user;
    const thread = await loadThreadOrThrow(req.params.threadId);
    const access = await loadBookAccess(thread.bookId, me);
    requireBookAccess(access);
    const [msg] = await db.select().from(commentMessage).where(
        and(eq(commentMessage.id, req.params.messageId), eq(commentMessage.threadId, thread.id)),
    );
    if (!msg) throw new AppError('errors.comment.notFound', 404, 'message not found');
    assertCanEditMessage(msg.authorId, me);

    const body = EditMessageBody.parse(req.body);
    await db.update(commentMessage).set({
        body: body.body,
        mentions: body.mentions ?? msg.mentions,
        editedAt: new Date(),
    }).where(eq(commentMessage.id, msg.id));

    res.json(await loadThreadWithMessages(thread.id));
}));

commentsRouter.post('/api/comments/:threadId/resolve', requireSession, authedHandler(async (req, res) => {
    const me = req.user;
    const thread = await loadThreadOrThrow(req.params.threadId);
    const access = await loadBookAccess(thread.bookId, me);
    requireBookAccess(access);
    assertCanResolve(access);
    const body = ResolveBody.parse(req.body);
    await db.update(commentThread).set({ resolved: body.resolved }).where(eq(commentThread.id, thread.id));
    res.json(await loadThreadWithMessages(thread.id));
}));

commentsRouter.delete('/api/comments/:threadId/messages/:messageId', requireSession, authedHandler(async (req, res) => {
    const me = req.user;
    const thread = await loadThreadOrThrow(req.params.threadId);
    const access = await loadBookAccess(thread.bookId, me);
    requireBookAccess(access);
    const [msg] = await db.select().from(commentMessage).where(
        and(eq(commentMessage.id, req.params.messageId), eq(commentMessage.threadId, thread.id)),
    );
    if (!msg) throw new AppError('errors.comment.notFound', 404, 'message not found');
    assertCanDeleteMessage(msg.authorId, me);

    // Atomic delete + conditional thread cleanup. Avoids the SELECT-then-DELETE race
    // where a concurrent insert could orphan an empty thread.
    const threadDeleted = await db.transaction(async (tx) => {
        await tx.delete(commentMessage).where(eq(commentMessage.id, msg.id));
        const removed = await tx.execute<{ id: string }>(sql`
            DELETE FROM comment_thread
            WHERE id = ${thread.id}
            AND NOT EXISTS (SELECT 1 FROM comment_message WHERE thread_id = ${thread.id})
            RETURNING id
        `);
        return removed.rows.length > 0;
    });

    if (threadDeleted) return res.json({ deleted: true, threadDeleted: true });
    res.json(await loadThreadWithMessages(thread.id));
}));

commentsRouter.patch('/api/comments/:threadId/detach', requireSession, authedHandler(async (req, res) => {
    const me = req.user;
    const thread = await loadThreadOrThrow(req.params.threadId);
    const access = await loadBookAccess(thread.bookId, me);
    requireBookAccess(access);
    // Race-safe idempotency: COALESCE keeps the existing timestamp under concurrent writes.
    await db.update(commentThread)
        .set({ detachedAt: sql`COALESCE(${commentThread.detachedAt}, NOW())` })
        .where(eq(commentThread.id, thread.id));
    res.json(await loadThreadWithMessages(thread.id));
}));

commentsRouter.patch('/api/comments/:threadId/reattach', requireSession, authedHandler(async (req, res) => {
    const me = req.user;
    const thread = await loadThreadOrThrow(req.params.threadId);
    const access = await loadBookAccess(thread.bookId, me);
    requireBookAccess(access);
    await db.update(commentThread).set({ detachedAt: null }).where(eq(commentThread.id, thread.id));
    res.json(await loadThreadWithMessages(thread.id));
}));

commentsRouter.delete('/api/comments/:threadId', requireSession, authedHandler(async (req, res) => {
    const me = req.user;
    const thread = await loadThreadOrThrow(req.params.threadId);
    const access = await loadBookAccess(thread.bookId, me);
    requireBookAccess(access);
    assertCanDeleteThread(access);
    await db.delete(commentThread).where(eq(commentThread.id, thread.id));
    res.status(204).end();
}));
