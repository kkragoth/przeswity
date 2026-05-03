import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import * as Y from 'yjs';
import { db } from '../db/client.js';
import { commentThread, commentMessage, bookYjsState } from '../db/schema.js';
import { asByteaInput } from '../lib/bytes.js';
import { buildProseMirrorSchema, PROSEMIRROR_FIELD } from '@przeswity/editor-schema';
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from 'y-prosemirror';
import type { SeedThread } from './data/types.js';

type PMMarkJson = { type: string; attrs?: Record<string, unknown> };
type PMJson = {
    type: string;
    text?: string;
    attrs?: Record<string, unknown>;
    marks?: PMMarkJson[];
    content?: PMJson[];
};

function addCommentMarkToTextNode(node: PMJson, quote: string, commentId: string): PMJson[] | null {
    if (node.type !== 'text' || !node.text) return null;
    const index = node.text.indexOf(quote);
    if (index < 0) return null;
    const before = node.text.slice(0, index);
    const match = node.text.slice(index, index + quote.length);
    const after = node.text.slice(index + quote.length);
    const baseMarks = node.marks ?? [];
    const commentMark: PMMarkJson = { type: 'comment', attrs: { commentId } };
    const out: PMJson[] = [];
    if (before) out.push({ ...node, text: before, marks: baseMarks });
    out.push({ ...node, text: match, marks: [...baseMarks.filter((m) => m.type !== 'comment'), commentMark] });
    if (after) out.push({ ...node, text: after, marks: baseMarks });
    return out;
}

function addCommentMark(json: PMJson, quote: string, commentId: string): boolean {
    if (!Array.isArray(json.content)) return false;
    for (let i = 0; i < json.content.length; i += 1) {
        const child = json.content[i];
        const split = addCommentMarkToTextNode(child, quote, commentId);
        if (split) {
            json.content.splice(i, 1, ...split);
            return true;
        }
        if (addCommentMark(child, quote, commentId)) return true;
    }
    return false;
}

export async function reseedBookComments(bookId: string, threads: SeedThread[]): Promise<void> {
    const existing = await db.select({ id: commentThread.id }).from(commentThread).where(eq(commentThread.bookId, bookId));
    for (const row of existing) {
        await db.delete(commentMessage).where(eq(commentMessage.threadId, row.id));
    }
    await db.delete(commentThread).where(eq(commentThread.bookId, bookId));

    const now = Date.now();
    for (const t of threads) {
        const createdAt = new Date(now - t.minutesAgo * 60_000);
        const threadId = randomUUID();
        await db.insert(commentThread).values({
            id: threadId,
            bookId,
            anchorId: t.anchorId,
            quote: t.originalQuote,
            resolved: t.status === 'resolved',
            createdById: t.author.id,
            createdAt,
        });
        await db.insert(commentMessage).values({
            id: randomUUID(),
            threadId,
            authorId: t.author.id,
            body: t.body,
            mentions: { userIds: [], roles: t.targetRole ? [t.targetRole] : [] },
            createdAt,
        });
        for (const rep of t.replies) {
            await db.insert(commentMessage).values({
                id: randomUUID(),
                threadId,
                authorId: rep.author.id,
                body: rep.body,
                mentions: { userIds: [], roles: [] },
                createdAt: new Date(now - rep.minutesAgo * 60_000),
            });
        }
    }
}

function applyThreadsToYDoc(doc: Y.Doc, threads: SeedThread[]): void {
    const map = doc.getMap('comments');
    map.clear();
    for (const t of threads) {
        map.set(t.id, {
            id: t.id,
            authorId: t.author.id,
            authorName: t.author.name,
            authorRole: t.author.role,
            authorColor: t.author.color,
            targetRole: t.targetRole,
            body: t.body,
            originalQuote: t.originalQuote,
            createdAt: Date.now() - t.minutesAgo * 60_000,
            status: t.status,
            resolvedBy: t.resolvedBy,
            resolvedAt: t.status === 'resolved' && t.resolvedMinutesAgo !== undefined
                ? Date.now() - t.resolvedMinutesAgo * 60_000
                : undefined,
            replies: t.replies.map((r, idx) => ({
                id: `${t.id}-reply-${idx + 1}`,
                authorId: r.author.id,
                authorName: r.author.name,
                authorRole: r.author.role,
                authorColor: r.author.color,
                body: r.body,
                createdAt: Date.now() - r.minutesAgo * 60_000,
            })),
        });
    }
}

function applyThreadMarksToYDoc(sourceDoc: Y.Doc, threads: SeedThread[]): Y.Doc {
    const json = yDocToProsemirrorJSON(sourceDoc, PROSEMIRROR_FIELD) as PMJson;
    for (const t of threads) {
        const marked = addCommentMark(json, t.originalQuote, t.id);
        if (!marked) {
            console.warn(`[seed] comment quote not found for ${t.id}: ${t.originalQuote}`);
        }
    }
    const schema = buildProseMirrorSchema();
    const markedDoc = prosemirrorJSONToYDoc(schema, json, PROSEMIRROR_FIELD);
    applyThreadsToYDoc(markedDoc, threads);
    return markedDoc;
}

export async function applyThreadsToBookYjs(bookId: string, threads: SeedThread[]): Promise<void> {
    const yState = await db.select({ state: bookYjsState.state }).from(bookYjsState).where(eq(bookYjsState.bookId, bookId));
    if (!yState[0]?.state) return;
    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(yState[0].state));
    applyThreadsToYDoc(doc, threads);
    const markedDoc = applyThreadMarksToYDoc(doc, threads);
    const markedBytes = asByteaInput(Y.encodeStateAsUpdate(markedDoc));
    await db.update(bookYjsState).set({
        state: markedBytes,
        sizeBytes: markedBytes.byteLength,
        updatedAt: new Date(),
    }).where(eq(bookYjsState.bookId, bookId));
}
