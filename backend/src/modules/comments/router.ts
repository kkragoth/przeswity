import { Router } from 'express';
import { z } from 'zod';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { book, assignment, user, commentThread, commentMessage } from '../../db/schema.js';
import { requireSession } from '../../auth/session.js';
import { asyncHandler, AppError } from '../../lib/errors.js';
import { registry } from '../../openapi/registry.js';
import {
    CommentThreadDto,
    CreateThreadBody,
    CreateReplyBody,
    EditMessageBody,
    ResolveBody,
    CommentsListQuery,
} from './schemas.js';

export const commentsRouter = Router();

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

async function loadBookOrThrow(bookId: string) {
    const [b] = await db.select().from(book).where(eq(book.id, bookId));
    if (!b) throw new AppError('errors.book.notFound', 404, 'book not found');
    return b;
}

async function loadThreadOrThrow(threadId: string) {
    const [t] = await db.select().from(commentThread).where(eq(commentThread.id, threadId));
    if (!t) throw new AppError('errors.comment.notFound', 404, 'thread not found');
    return t;
}

async function getUserAssignmentRoles(bookId: string, userId: string): Promise<string[]> {
    const rows = await db.select({ role: assignment.role })
        .from(assignment)
        .where(and(eq(assignment.bookId, bookId), eq(assignment.userId, userId)));
    return rows.map((r) => r.role);
}

async function hasReadAccess(bookId: string, me: any): Promise<boolean> {
    if (me.isAdmin) return true;
    const [b] = await db.select().from(book).where(eq(book.id, bookId));
    if (!b) return false;
    if (b.createdById === me.id) return true;
    const roles = await getUserAssignmentRoles(bookId, me.id);
    return roles.length > 0;
}

async function canResolveThread(bookId: string, me: any): Promise<boolean> {
    if (me.isAdmin) return true;
    const [b] = await db.select().from(book).where(eq(book.id, bookId));
    if (!b) return false;
    if (b.createdById === me.id) return true;
    const roles = await getUserAssignmentRoles(bookId, me.id);
    return roles.includes('editor') || roles.includes('coordinator');
}

async function canDeleteThread(bookId: string, me: any): Promise<boolean> {
    if (me.isAdmin) return true;
    const [b] = await db.select().from(book).where(eq(book.id, bookId));
    if (!b) return false;
    return b.createdById === me.id;
}

// ── Projection helpers ─────────────────────────────────────────────────────

function toIso(d: Date | null | undefined): string | null {
    return d ? new Date(d).toISOString() : null;
}

function buildThreadDto(thread: any, messages: any[]): any {
    return {
        id: thread.id,
        bookId: thread.bookId,
        anchorId: thread.anchorId,
        quote: thread.quote,
        resolved: thread.resolved,
        detachedAt: toIso(thread.detachedAt),
        createdById: thread.createdById,
        createdAt: new Date(thread.createdAt).toISOString(),
        messages: messages
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((m) => ({
                id: m.id,
                threadId: m.threadId,
                authorId: m.authorId,
                body: m.body,
                mentions: m.mentions ?? { userIds: [], roles: [] },
                editedAt: toIso(m.editedAt),
                createdAt: new Date(m.createdAt).toISOString(),
                author: m.author,
            })),
    };
}

async function loadThreadWithMessages(threadId: string): Promise<any> {
    const [thread] = await db.select().from(commentThread).where(eq(commentThread.id, threadId));
    if (!thread) return null;
    const rows = await db.select({
        msg: commentMessage,
        author: { id: user.id, email: user.email, name: user.name, color: user.color, image: user.image },
    }).from(commentMessage)
        .innerJoin(user, eq(user.id, commentMessage.authorId))
        .where(eq(commentMessage.threadId, threadId));
    const messages = rows.map((r) => ({ ...r.msg, author: r.author }));
    return buildThreadDto(thread, messages);
}

// ── Status filtering ───────────────────────────────────────────────────────

function matchesStatus(thread: any, status: string): boolean {
    if (status === 'active') return !thread.resolved && !thread.detachedAt;
    if (status === 'resolved') return thread.resolved;
    if (status === 'detached') return !thread.resolved && !!thread.detachedAt;
    return true; // 'all'
}

// ── Routes ─────────────────────────────────────────────────────────────────

commentsRouter.get('/api/books/:bookId/comments', requireSession, asyncHandler(async (req: any, res) => {
    const me = req.user;
    if (!(await hasReadAccess(req.params.bookId, me))) {
        throw new AppError('errors.book.forbidden', 403, 'no access');
    }
    await loadBookOrThrow(req.params.bookId);
    const query = CommentsListQuery.parse(req.query);

    const threads = await db.select().from(commentThread).where(eq(commentThread.bookId, req.params.bookId));
    if (threads.length === 0) return res.json([]);

    const threadIds = threads.map((t) => t.id);
    const msgRows = await db.select({
        msg: commentMessage,
        author: { id: user.id, email: user.email, name: user.name, color: user.color, image: user.image },
    }).from(commentMessage)
        .innerJoin(user, eq(user.id, commentMessage.authorId))
        .where(inArray(commentMessage.threadId, threadIds));

    const messagesByThread = new Map<string, any[]>();
    for (const row of msgRows) {
        const list = messagesByThread.get(row.msg.threadId) ?? [];
        list.push({ ...row.msg, author: row.author });
        messagesByThread.set(row.msg.threadId, list);
    }

    let myRoles: string[] = [];
    if (query.mentionsMe) {
        myRoles = await getUserAssignmentRoles(req.params.bookId, me.id);
    }

    const result = threads
        .filter((t) => matchesStatus(t, query.status))
        .map((t) => {
            const msgs = messagesByThread.get(t.id) ?? [];
            return { thread: t, messages: msgs };
        })
        .filter(({ messages }) => {
            if (query.author && !messages.some((m) => m.authorId === query.author)) return false;
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

commentsRouter.post('/api/books/:bookId/comments', requireSession, asyncHandler(async (req: any, res) => {
    const me = req.user;
    if (!(await hasReadAccess(req.params.bookId, me))) {
        throw new AppError('errors.book.forbidden', 403, 'no access');
    }
    await loadBookOrThrow(req.params.bookId);
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

commentsRouter.post('/api/comments/:threadId/messages', requireSession, asyncHandler(async (req: any, res) => {
    const me = req.user;
    const thread = await loadThreadOrThrow(req.params.threadId);
    if (!(await hasReadAccess(thread.bookId, me))) {
        throw new AppError('errors.book.forbidden', 403, 'no access');
    }
    const body = CreateReplyBody.parse(req.body);

    await db.insert(commentMessage).values({
        threadId: thread.id,
        authorId: me.id,
        body: body.body,
        mentions: body.mentions ?? { userIds: [], roles: [] },
    });

    res.json(await loadThreadWithMessages(thread.id));
}));

commentsRouter.patch('/api/comments/:threadId/messages/:messageId', requireSession, asyncHandler(async (req: any, res) => {
    const me = req.user;
    const thread = await loadThreadOrThrow(req.params.threadId);
    if (!(await hasReadAccess(thread.bookId, me))) {
        throw new AppError('errors.book.forbidden', 403, 'no access');
    }
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

commentsRouter.post('/api/comments/:threadId/resolve', requireSession, asyncHandler(async (req: any, res) => {
    const me = req.user;
    const thread = await loadThreadOrThrow(req.params.threadId);
    if (!(await canResolveThread(thread.bookId, me))) {
        throw new AppError('errors.comment.forbidden', 403, 'cannot resolve');
    }
    const body = ResolveBody.parse(req.body);
    await db.update(commentThread).set({ resolved: body.resolved }).where(eq(commentThread.id, thread.id));
    res.json(await loadThreadWithMessages(thread.id));
}));

commentsRouter.delete('/api/comments/:threadId/messages/:messageId', requireSession, asyncHandler(async (req: any, res) => {
    const me = req.user;
    const thread = await loadThreadOrThrow(req.params.threadId);
    if (!(await hasReadAccess(thread.bookId, me))) {
        throw new AppError('errors.book.forbidden', 403, 'no access');
    }
    const [msg] = await db.select().from(commentMessage).where(
        and(eq(commentMessage.id, req.params.messageId), eq(commentMessage.threadId, thread.id)),
    );
    if (!msg) throw new AppError('errors.comment.notFound', 404, 'message not found');
    if (msg.authorId !== me.id && !me.isAdmin) {
        throw new AppError('errors.comment.forbidden', 403, 'forbidden');
    }

    // Count messages before deleting
    const allMessages = await db.select({ id: commentMessage.id })
        .from(commentMessage)
        .where(eq(commentMessage.threadId, thread.id));

    await db.delete(commentMessage).where(eq(commentMessage.id, msg.id));

    if (allMessages.length === 1) {
        // Only message — cascade delete the thread
        await db.delete(commentThread).where(eq(commentThread.id, thread.id));
        return res.json({ deleted: true, threadDeleted: true });
    }

    res.json(await loadThreadWithMessages(thread.id));
}));

commentsRouter.patch('/api/comments/:threadId/detach', requireSession, asyncHandler(async (req: any, res) => {
    const me = req.user;
    const thread = await loadThreadOrThrow(req.params.threadId);
    if (!(await hasReadAccess(thread.bookId, me))) {
        throw new AppError('errors.book.forbidden', 403, 'no access');
    }
    // Idempotent: COALESCE(detached_at, NOW())
    await db.update(commentThread)
        .set({ detachedAt: thread.detachedAt ?? new Date() })
        .where(eq(commentThread.id, thread.id));
    res.json(await loadThreadWithMessages(thread.id));
}));

commentsRouter.patch('/api/comments/:threadId/reattach', requireSession, asyncHandler(async (req: any, res) => {
    const me = req.user;
    const thread = await loadThreadOrThrow(req.params.threadId);
    if (!(await hasReadAccess(thread.bookId, me))) {
        throw new AppError('errors.book.forbidden', 403, 'no access');
    }
    await db.update(commentThread).set({ detachedAt: null }).where(eq(commentThread.id, thread.id));
    res.json(await loadThreadWithMessages(thread.id));
}));

commentsRouter.delete('/api/comments/:threadId', requireSession, asyncHandler(async (req: any, res) => {
    const me = req.user;
    const thread = await loadThreadOrThrow(req.params.threadId);
    if (!(await canDeleteThread(thread.bookId, me))) {
        throw new AppError('errors.comment.forbidden', 403, 'only book owner or admin can delete threads');
    }
    // cascade to messages via FK
    await db.delete(commentThread).where(eq(commentThread.id, thread.id));
    res.status(204).end();
}));
