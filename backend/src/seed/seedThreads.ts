import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import * as Y from 'yjs';
import { db } from '../db/client.js';
import { commentThread, commentMessage, bookYjsState } from '../db/schema.js';
import { asByteaInput } from '../lib/bytes.js';
import { log } from '../lib/log.js';
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

function splitTextNodeAt(node: PMJson, quote: string, commentId: string): PMJson[] | null {
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

function countOccurrences(json: PMJson, quote: string): number {
    let n = 0;
    if (json.type === 'text' && json.text) {
        let from = 0;
        while (true) {
            const idx = json.text.indexOf(quote, from);
            if (idx < 0) break;
            n += 1;
            from = idx + quote.length;
        }
    }
    if (Array.isArray(json.content)) {
        for (const child of json.content) n += countOccurrences(child, quote);
    }
    return n;
}

interface MarkPlan { remaining: number; done: boolean }

/**
 * Walks the doc in order; skips `plan.remaining` matches of `quote`, then marks the next one.
 * Markdown maps each paragraph to a single text node, so per-node occurrence is at most one in
 * practice. Caller clamps `remaining` to `countOccurrences(...) - 1` to guarantee a hit.
 */
function markNthOccurrence(json: PMJson, quote: string, commentId: string, plan: MarkPlan): void {
    if (plan.done || !Array.isArray(json.content)) return;
    for (let i = 0; i < json.content.length; i += 1) {
        if (plan.done) return;
        const child = json.content[i];
        if (child.type === 'text' && child.text && child.text.includes(quote)) {
            if (plan.remaining > 0) {
                plan.remaining -= 1;
                continue;
            }
            const split = splitTextNodeAt(child, quote, commentId);
            if (split) {
                json.content.splice(i, 1, ...split);
                plan.done = true;
                return;
            }
        }
        markNthOccurrence(child, quote, commentId, plan);
    }
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
        const total = countOccurrences(json, t.originalQuote);
        if (total === 0) {
            log.warn('seed: comment quote not found', { threadId: t.id, quote: t.originalQuote });
            continue;
        }
        const idx = Math.min(t.occurrenceIndex, total - 1);
        const plan: MarkPlan = { remaining: idx, done: false };
        markNthOccurrence(json, t.originalQuote, t.id, plan);
        if (!plan.done) {
            log.warn('seed: comment quote mark failed', {
                threadId: t.id,
                quote: t.originalQuote,
                requestedIndex: t.occurrenceIndex,
                clampedIndex: idx,
                total,
            });
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
