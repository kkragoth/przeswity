import { Router } from 'express';
import { z } from 'zod';
import { eq, and, inArray, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { user, commentThread, commentMessage } from '../../db/schema.js';
import { requireSession, authedHandler } from '../../auth/session.js';
import { AppError } from '../../lib/errors.js';
import { isAdmin } from '../../lib/permissions.js';
import { loadBookAccess, requireBookAccess } from '../../lib/access.js';
import { registry } from '../../openapi/registry.js';
import { toIso, toIsoOrThrow } from '../../lib/dto.js';
import { userPublicCols } from '../../db/projections.js';
import {
    CommentThreadDto,
    CreateThreadBody,
    CreateReplyBody,
    EditMessageBody,
    ResolveBody,
    CommentsListQuery,
} from './schemas.js';

export const commentsRouter = Router();

type CommentThreadRow = InferSelectModel<typeof commentThread>;
type CommentMessageRow = InferSelectModel<typeof commentMessage>;
type PublicAuthor = { id: string; email: string; name: string; color: string | null; image: string | null };
type MessageWithAuthor = CommentMessageRow & { author: PublicAuthor };
type ThreadDto = z.infer<typeof CommentThreadDto>;
type DtoMentions = ThreadDto['messages'][number]['mentions'];

// ── OpenAPI registrations ──────────────────────────────────────────────────

registry.registerPath({
    method: 'get', path: '/api/books/{bookId}/comments',
    operationId: 'commentsList',
    request: {
        params: z.object({ bookId: z.string() }),
        query: CommentsListQuery,
    },
    responses: { 200: { description: 'list', content: { 'application/json': { schema: z.array(CommentThreadDto) } } } },
});
registry.registerPath({
    method: 'post', path: '/api/books/{bookId}/comments',
    operationId: 'commentCreate',
    request: {
        params: z.object({ bookId: z.string() }),
        body: { content: { 'application/json': { schema: CreateThreadBody } } },
    },
    responses: { 200: { description: 'created', content: { 'application/json': { schema: CommentThreadDto } } } },
});
registry.registerPath({
    method: 'post', path: '/api/comments/{threadId}/messages',
    operationId: 'commentReply',
    request: {
        params: z.object({ threadId: z.string() }),
        body: { content: { 'application/json': { schema: CreateReplyBody } } },
    },
    responses: { 200: { description: 'replied', content: { 'application/json': { schema: CommentThreadDto } } } },
});
registry.registerPath({
    method: 'patch', path: '/api/comments/{threadId}/messages/{messageId}',
    operationId: 'commentMessageEdit',
    request: {
        params: z.object({ threadId: z.string(), messageId: z.string() }),
        body: { content: { 'application/json': { schema: EditMessageBody } } },
    },
    responses: { 200: { description: 'edited', content: { 'application/json': { schema: CommentThreadDto } } } },
});
registry.registerPath({
    method: 'post', path: '/api/comments/{threadId}/resolve',
    operationId: 'commentResolve',
    request: {
        params: z.object({ threadId: z.string() }),
        body: { content: { 'application/json': { schema: ResolveBody } } },
    },
    responses: { 200: { description: 'resolved', content: { 'application/json': { schema: CommentThreadDto } } } },
});
registry.registerPath({
    method: 'delete', path: '/api/comments/{threadId}/messages/{messageId}',
    operationId: 'commentMessageDelete',
    request: { params: z.object({ threadId: z.string(), messageId: z.string() }) },
    responses: { 200: { description: 'deleted or thread removed' } },
});
registry.registerPath({
    method: 'patch', path: '/api/comments/{threadId}/detach',
    operationId: 'commentThreadDetach',
    request: { params: z.object({ threadId: z.string() }) },
    responses: { 200: { description: 'detached', content: { 'application/json': { schema: CommentThreadDto } } } },
});
registry.registerPath({
    method: 'patch', path: '/api/comments/{threadId}/reattach',
    operationId: 'commentThreadReattach',
    request: { params: z.object({ threadId: z.string() }) },
    responses: { 200: { description: 'reattached', content: { 'application/json': { schema: CommentThreadDto } } } },
});
registry.registerPath({
    method: 'delete', path: '/api/comments/{threadId}',
    operationId: 'commentThreadDelete',
    request: { params: z.object({ threadId: z.string() }) },
    responses: { 204: { description: 'deleted' } },
});

// ── Shared helpers ─────────────────────────────────────────────────────────

async function loadThreadOrThrow(threadId: string): Promise<CommentThreadRow> {
    const [t] = await db.select().from(commentThread).where(eq(commentThread.id, threadId));
    if (!t) throw new AppError('errors.comment.notFound', 404, 'thread not found');
    return t;
}

// ── Projection helpers ─────────────────────────────────────────────────────

function buildThreadDto(thread: CommentThreadRow, messages: MessageWithAuthor[]): ThreadDto {
    return {
        id: thread.id,
        bookId: thread.bookId,
        anchorId: thread.anchorId,
        quote: thread.quote,
        resolved: thread.resolved,
        detachedAt: toIso(thread.detachedAt),
        createdById: thread.createdById,
        createdAt: toIsoOrThrow(thread.createdAt),
        messages: messages
            .slice()
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((m) => ({
                id: m.id,
                threadId: m.threadId,
                authorId: m.authorId,
                body: m.body,
                mentions: (m.mentions ?? { userIds: [], roles: [] }) as DtoMentions,
                editedAt: toIso(m.editedAt),
                createdAt: toIsoOrThrow(m.createdAt),
                author: {
                    id: m.author.id,
                    email: m.author.email,
                    name: m.author.name,
                    color: m.author.color ?? '#7c3aed',
                    image: m.author.image,
                },
            })),
    };
}

async function loadThreadWithMessages(threadId: string): Promise<ThreadDto | null> {
    const [thread] = await db.select().from(commentThread).where(eq(commentThread.id, threadId));
    if (!thread) return null;
    const rows = await db.select({
        msg: commentMessage,
        author: userPublicCols,
    }).from(commentMessage)
        .innerJoin(user, eq(user.id, commentMessage.authorId))
        .where(eq(commentMessage.threadId, threadId));
    const messages: MessageWithAuthor[] = rows.map((r) => ({ ...r.msg, author: r.author }));
    return buildThreadDto(thread, messages);
}

// ── Routes ─────────────────────────────────────────────────────────────────

commentsRouter.get('/api/books/:bookId/comments', requireSession, authedHandler(async (req, res) => {
    const me = req.user;
    const access = await loadBookAccess(req.params.bookId, me);
    requireBookAccess(access);
    const query = CommentsListQuery.parse(req.query);

    // Push status + author into SQL so we don't pull every thread/message in the book just
    // to filter in JS. mentions filtering still runs in-memory but on the narrowed set.
    const conditions = [eq(commentThread.bookId, req.params.bookId)];
    if (query.status === 'active') {
        conditions.push(eq(commentThread.resolved, false));
        conditions.push(sql`${commentThread.detachedAt} IS NULL`);
    } else if (query.status === 'resolved') {
        conditions.push(eq(commentThread.resolved, true));
    } else if (query.status === 'detached') {
        conditions.push(eq(commentThread.resolved, false));
        conditions.push(sql`${commentThread.detachedAt} IS NOT NULL`);
    }
    if (query.author) {
        conditions.push(sql`EXISTS (SELECT 1 FROM ${commentMessage} WHERE ${commentMessage.threadId} = ${commentThread.id} AND ${commentMessage.authorId} = ${query.author})`);
    }
    const threads = await db.select().from(commentThread).where(and(...conditions));
    if (threads.length === 0) return res.json([]);

    const threadIds = threads.map((t) => t.id);
    const msgRows = await db.select({
        msg: commentMessage,
        author: userPublicCols,
    }).from(commentMessage)
        .innerJoin(user, eq(user.id, commentMessage.authorId))
        .where(inArray(commentMessage.threadId, threadIds));

    const messagesByThread = new Map<string, MessageWithAuthor[]>();
    for (const row of msgRows) {
        const list = messagesByThread.get(row.msg.threadId) ?? [];
        list.push({ ...row.msg, author: row.author });
        messagesByThread.set(row.msg.threadId, list);
    }

    const myRoles: string[] = query.mentionsMe ? access.roles : [];

    const result = threads
        .map((t) => ({ thread: t, messages: messagesByThread.get(t.id) ?? [] }))
        .filter(({ messages }) => {
            if (query.mentionsRole && !messages.some((m) => {
                const roles: string[] = m.mentions?.roles ?? [];
                return roles.includes(query.mentionsRole!);
            })) return false;
            if (query.mentionsMe) {
                const matchById = messages.some((m) => (m.mentions?.userIds ?? []).includes(me.id));
                const matchByRole = messages.some((m) => {
                    const msgRoles: string[] = m.mentions?.roles ?? [];
                    return myRoles.some((r) => msgRoles.includes(r));
                });
                if (!matchById && !matchByRole) return false;
            }
            return true;
        })
        .map(({ thread, messages }) => buildThreadDto(thread, messages));

    res.json(result);
}));

commentsRouter.post('/api/books/:bookId/comments', requireSession, authedHandler(async (req, res) => {
    const me = req.user;
    const access = await loadBookAccess(req.params.bookId, me);
    requireBookAccess(access);
    if (!access.permissions.canComment) throw new AppError('errors.comment.forbidden', 403, 'cannot comment');
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
    if (!access.permissions.canComment) throw new AppError('errors.comment.forbidden', 403, 'cannot comment');
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
    if (msg.authorId !== me.id) throw new AppError('errors.comment.forbidden', 403, 'not your message');

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
    if (!access.permissions.canResolve) throw new AppError('errors.comment.forbidden', 403, 'cannot resolve');
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
    if (msg.authorId !== me.id && !isAdmin(me.systemRole)) {
        throw new AppError('errors.comment.forbidden', 403, 'forbidden');
    }

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
    // Race-safe idempotency: COALESCE keeps the existing timestamp under concurrent writes
    // instead of stomping it with whatever value JS observed at SELECT time.
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

// Thread deletion is an explicit owner/admin policy — kept outside Permissions so the
// role matrix can't silently grant deletion to translators etc. via a future edit.
commentsRouter.delete('/api/comments/:threadId', requireSession, authedHandler(async (req, res) => {
    const me = req.user;
    const thread = await loadThreadOrThrow(req.params.threadId);
    const access = await loadBookAccess(thread.bookId, me);
    requireBookAccess(access);
    if (!access.isAdmin && !access.isOwner) {
        throw new AppError('errors.comment.forbidden', 403, 'only book owner or admin can delete threads');
    }
    await db.delete(commentThread).where(eq(commentThread.id, thread.id));
    res.status(204).end();
}));
