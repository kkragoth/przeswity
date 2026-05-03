import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import * as Y from 'yjs';
import { db, pool } from '../db/client.js';
import { user, book, assignment, bookYjsState, commentThread, commentMessage } from '../db/schema.js';
import { auth } from '../auth/betterAuth.config.js';
import { DEV_PASSWORD } from './devPassword.js';
import { seedBookId } from './ids.js';
import { buildProseMirrorSchema, PROSEMIRROR_FIELD } from '@przeswity/editor-schema';
import { markdownToYDocState } from '@przeswity/editor-schema/markdown';
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from 'y-prosemirror';
import { asByteaInput } from '../lib/bytes.js';
import { USERS } from './data/users.js';
import { BOOKS } from './data/books.js';
import { buildSeedThreads } from './data/threads.js';
import type { Role, SeedBook, SeedThread, SeedUser } from './data/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fix = (name: string) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

type PMMarkJson = { type: string; attrs?: Record<string, unknown> };
type PMJson = {
    type: string;
    text?: string;
    attrs?: Record<string, unknown>;
    marks?: PMMarkJson[];
    content?: PMJson[];
};

async function upsertSeedUser(spec: SeedUser) {
    try {
        await auth.api.signUpEmail({ body: { email: spec.email, password: DEV_PASSWORD, name: spec.name }, asResponse: true });
    } catch (e: any) {
        const code = e?.body?.code ?? e?.cause?.code ?? '';
        if (code !== 'USER_ALREADY_EXISTS' && !String(e?.message ?? '').toUpperCase().includes('ALREADY')) {
            console.warn(`[seed] signUpEmail for ${spec.email} threw:`, code || e?.message);
        }
    }
    await db.update(user).set({
        name: spec.name,
        systemRole: spec.systemRole,
        competencyTags: spec.tags,
        color: spec.color,
        preferredLocale: 'pl',
    }).where(eq(user.email, spec.email));
}

async function upsertSeedBook(spec: SeedBook, ownerId: string) {
    const id = seedBookId(spec.slug);
    const md = fix(spec.fixture);
    const yState = markdownToYDocState(md);

    const seededDoc = new Y.Doc();
    Y.applyUpdate(seededDoc, yState);

    await db.insert(book).values({
        id,
        title: spec.title,
        description: spec.description,
        createdById: ownerId,
        initialMarkdown: md,
    }).onConflictDoUpdate({
        target: book.id,
        set: { title: spec.title, description: spec.description, initialMarkdown: md },
    });

    await db.insert(bookYjsState).values({ bookId: id, state: asByteaInput(Y.encodeStateAsUpdate(seededDoc)) })
        .onConflictDoUpdate({ target: bookYjsState.bookId, set: { state: asByteaInput(yState), updatedAt: new Date() } });
    return id;
}

async function upsertAssignment(bookId: string, userId: string, role: Role) {
    await db.insert(assignment).values({ bookId, userId, role }).onConflictDoNothing();
}

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

async function reseedBookComments(bookId: string, threads: SeedThread[]) {
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

function applyThreadsToYDoc(doc: Y.Doc, threads: SeedThread[]) {
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

export async function seedAll() {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('[seed] refusing to run dev seed in production');
    }
    console.log('[seed] starting…');
    for (const u of USERS) {
        await upsertSeedUser(u);
        console.log(`[seed] user ${u.email}`);
    }

    const allUsers = await db.select().from(user);
    const idByEmail = new Map(allUsers.map((u) => [u.email, u.id]));
    const userByEmail = new Map(USERS.map((u) => [u.email, u]));

    for (const b of BOOKS) {
        const ownerId = idByEmail.get(b.ownerEmail);
        if (!ownerId) { console.warn(`[seed] no owner found for ${b.slug}`); continue; }
        const bookId = await upsertSeedBook(b, ownerId);
        const threads = buildSeedThreads(b, idByEmail, userByEmail);
        const yState = await db.select({ state: bookYjsState.state }).from(bookYjsState).where(eq(bookYjsState.bookId, bookId));
        if (yState[0]?.state) {
            const doc = new Y.Doc();
            Y.applyUpdate(doc, new Uint8Array(yState[0].state));
            applyThreadsToYDoc(doc, threads);
            const markedDoc = applyThreadMarksToYDoc(doc, threads);
            await db.update(bookYjsState).set({
                state: asByteaInput(Y.encodeStateAsUpdate(markedDoc)),
                updatedAt: new Date(),
            }).where(eq(bookYjsState.bookId, bookId));
        }
        await reseedBookComments(bookId, threads);
        for (const a of b.assignments) {
            const uid = idByEmail.get(a.email);
            if (!uid) { console.warn(`[seed] no user for assignment ${a.email}`); continue; }
            await upsertAssignment(bookId, uid, a.role);
        }
        console.log(`[seed] book ${b.slug} (${bookId})`);
    }
    console.log('[seed] complete.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
    await seedAll();
    await pool.end();
}
