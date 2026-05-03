import { z } from 'zod';
import { eq, and, inArray, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { user, commentThread, commentMessage } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import { userPublicCols } from '../../db/projections.js';
import { buildThreadDto, type CommentThreadRow, type MessageWithAuthor, type ThreadDto } from './dto.js';
import { CommentsListQuery } from './schemas.js';

export async function loadThreadOrThrow(threadId: string): Promise<CommentThreadRow> {
    const [t] = await db.select().from(commentThread).where(eq(commentThread.id, threadId));
    if (!t) throw new AppError('errors.comment.notFound', 404, 'thread not found');
    return t;
}

export async function loadThreadWithMessages(threadId: string): Promise<ThreadDto | null> {
    const [thread] = await db.select().from(commentThread).where(eq(commentThread.id, threadId));
    if (!thread) return null;
    const rows = await db.select({ msg: commentMessage, author: userPublicCols })
        .from(commentMessage)
        .innerJoin(user, eq(user.id, commentMessage.authorId))
        .where(eq(commentMessage.threadId, threadId));
    const messages: MessageWithAuthor[] = rows.map((r) => ({ ...r.msg, author: r.author }));
    return buildThreadDto(thread, messages);
}

type ListQuery = z.infer<typeof CommentsListQuery>;

const buildStatusConditions = (status: ListQuery['status']): SQL[] => {
    if (status === 'active') return [eq(commentThread.resolved, false), sql`${commentThread.detachedAt} IS NULL`];
    if (status === 'resolved') return [eq(commentThread.resolved, true)];
    if (status === 'detached') return [eq(commentThread.resolved, false), sql`${commentThread.detachedAt} IS NOT NULL`];
    return [];
};

const messageMatchesMentionsRole = (m: MessageWithAuthor, role: string): boolean =>
    (m.mentions?.roles ?? []).includes(role);

const messagesMatchMentionsMe = (messages: MessageWithAuthor[], userId: string, myRoles: string[]): boolean => {
    const byId = messages.some((m) => (m.mentions?.userIds ?? []).includes(userId));
    const byRole = messages.some((m) => myRoles.some((r) => (m.mentions?.roles ?? []).includes(r)));
    return byId || byRole;
};

export async function listThreadsForBook(
    bookId: string,
    meId: string,
    myRoles: readonly string[],
    query: ListQuery,
): Promise<ThreadDto[]> {
    const conditions = [eq(commentThread.bookId, bookId), ...buildStatusConditions(query.status)];
    if (query.author) {
        // Subquery + inArray instead of a raw EXISTS fragment — the previous template was
        // safe (parameterised) but reviewers tend to flag any hand-written sql template.
        const authoredThreadIds = db.select({ id: commentMessage.threadId }).from(commentMessage)
            .where(eq(commentMessage.authorId, query.author));
        conditions.push(inArray(commentThread.id, authoredThreadIds));
    }
    const threads = await db.select().from(commentThread).where(and(...conditions));
    if (threads.length === 0) return [];

    const threadIds = threads.map((t) => t.id);
    const msgRows = await db.select({ msg: commentMessage, author: userPublicCols })
        .from(commentMessage)
        .innerJoin(user, eq(user.id, commentMessage.authorId))
        .where(inArray(commentMessage.threadId, threadIds));

    const messagesByThread = new Map<string, MessageWithAuthor[]>();
    for (const row of msgRows) {
        const list = messagesByThread.get(row.msg.threadId) ?? [];
        list.push({ ...row.msg, author: row.author });
        messagesByThread.set(row.msg.threadId, list);
    }

    return threads
        .map((t) => ({ thread: t, messages: messagesByThread.get(t.id) ?? [] }))
        .filter(({ messages }) => {
            if (query.mentionsRole && !messages.some((m) => messageMatchesMentionsRole(m, query.mentionsRole!))) return false;
            if (query.mentionsMe && !messagesMatchMentionsMe(messages, meId, [...myRoles])) return false;
            return true;
        })
        .map(({ thread, messages }) => buildThreadDto(thread, messages));
}
