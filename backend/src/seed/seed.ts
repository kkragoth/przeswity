import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import * as Y from 'yjs';
import { db, pool } from '../db/client.js';
import { user, book, assignment, bookYjsState, commentThread, commentMessage } from '../db/schema.js';
import { auth } from '../auth/betterAuth.js';
import { DEV_PASSWORD } from './devPassword.js';
import { seedBookId } from './ids.js';
import { buildProseMirrorSchema, PROSEMIRROR_FIELD } from '@przeswity/editor-schema';
import { markdownToYDocState } from '@przeswity/editor-schema/markdown';
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from 'y-prosemirror';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fix = (name: string) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

type Role = 'editor' | 'proofreader' | 'translator' | 'author' | 'typesetter' | 'coordinator';

interface SeedUser {
    email: string;
    name: string;
    isAdmin: boolean;
    isCoordinator: boolean;
    tags: string[];
    color: string;
}

interface SeedBook {
    slug: string;
    title: string;
    description: string;
    fixture: string;
    ownerEmail: string;
    assignments: { email: string; role: Role }[];
}

interface SeedActor {
    id: string;
    name: string;
    role: Role;
    color: string;
}

interface SeedReply {
    author: SeedActor;
    body: string;
    minutesAgo: number;
}

interface SeedThread {
    id: string;
    anchorId: string;
    author: SeedActor;
    targetRole: Role | null;
    originalQuote: string;
    body: string;
    minutesAgo: number;
    status: 'open' | 'resolved';
    resolvedBy?: string;
    resolvedMinutesAgo?: number;
    replies: SeedReply[];
}

type PMMarkJson = { type: string; attrs?: Record<string, unknown> };
type PMJson = {
    type: string;
    text?: string;
    attrs?: Record<string, unknown>;
    marks?: PMMarkJson[];
    content?: PMJson[];
};

const USERS: SeedUser[] = [
    { email: 'admin@local.test', name: 'Admin Adminowska', isAdmin: true, isCoordinator: false, tags: [], color: '#dc2626' },
    { email: 'coord1@local.test', name: 'Anna Koordynator', isAdmin: false, isCoordinator: true, tags: ['koordynator'], color: '#2563eb' },
    { email: 'coord2@local.test', name: 'Bartek Koordynator', isAdmin: false, isCoordinator: true, tags: ['koordynator'], color: '#0ea5e9' },
    { email: 'editor1@local.test', name: 'Ewa Redaktor', isAdmin: false, isCoordinator: false, tags: ['redaktor'], color: '#16a34a' },
    { email: 'editor2@local.test', name: 'Filip Redaktor', isAdmin: false, isCoordinator: false, tags: ['redaktor'], color: '#22c55e' },
    { email: 'proof1@local.test', name: 'Gosia Korektor', isAdmin: false, isCoordinator: false, tags: ['korekta'], color: '#a855f7' },
    { email: 'trans1@local.test', name: 'Hubert Tłumacz', isAdmin: false, isCoordinator: false, tags: ['tłumacz'], color: '#f59e0b' },
    { email: 'type1@local.test', name: 'Iza Składacz', isAdmin: false, isCoordinator: false, tags: ['skład'], color: '#ec4899' },
    { email: 'author1@local.test', name: 'Jan Autor', isAdmin: false, isCoordinator: false, tags: ['autor'], color: '#7c3aed' },
];

const BOOKS: SeedBook[] = [
    {
        slug: 'geopolityka-rzek',
        title: 'Geopolityka rzek',
        description: 'Esej o roli rzek transgranicznych w polityce międzynarodowej.',
        fixture: 'geopolityka-rzek.md',
        ownerEmail: 'coord1@local.test',
        assignments: [
            { email: 'editor1@local.test', role: 'editor' },
            { email: 'proof1@local.test', role: 'proofreader' },
            { email: 'author1@local.test', role: 'author' },
        ],
    },
    {
        slug: 'atlas-wiatrow',
        title: 'Atlas wiatrów',
        description: 'Tłumaczenie atlasu wiatrów stałych i lokalnych.',
        fixture: 'atlas-wiatrow.md',
        ownerEmail: 'coord1@local.test',
        assignments: [
            { email: 'trans1@local.test', role: 'translator' },
            { email: 'editor2@local.test', role: 'editor' },
            { email: 'proof1@local.test', role: 'proofreader' },
            { email: 'type1@local.test', role: 'typesetter' },
        ],
    },
    {
        slug: 'krotka-historia-chmur',
        title: 'Krótka historia chmur',
        description: 'Krótki esej o klasyfikacji chmur.',
        fixture: 'krotka-historia-chmur.md',
        ownerEmail: 'coord1@local.test',
        assignments: [
            { email: 'editor1@local.test', role: 'editor' },
            { email: 'proof1@local.test', role: 'proofreader' },
        ],
    },
    {
        slug: 'notatki-marginesu',
        title: 'Notatki marginesu',
        description: 'Krótkie rozważania.',
        fixture: 'notatki-marginesu.md',
        ownerEmail: 'coord2@local.test',
        assignments: [
            { email: 'editor2@local.test', role: 'editor' },
        ],
    },
];

async function upsertSeedUser(spec: SeedUser) {
    try {
        await auth.api.signUpEmail({ body: { email: spec.email, password: DEV_PASSWORD, name: spec.name }, asResponse: true });
    } catch (e: any) {
        const code = e?.body?.code ?? e?.cause?.code ?? '';
        if (code !== 'USER_ALREADY_EXISTS' && !String(e?.message ?? '').toUpperCase().includes('ALREADY')) {
            console.warn(`[seed] signUpEmail for ${spec.email} threw:`, code || e?.message);
        }
    }
    // After sign-up (or USER_ALREADY_EXISTS), apply our flags/tags by email.
    // BetterAuth owns the id — we only update non-auth fields.
    await db.update(user).set({
        name: spec.name,
        isAdmin: spec.isAdmin,
        isCoordinator: spec.isCoordinator,
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
        set: {
            title: spec.title,
            description: spec.description,
            initialMarkdown: md,
        },
    });

    await db.insert(bookYjsState).values({ bookId: id, state: Buffer.from(Y.encodeStateAsUpdate(seededDoc)) as any })
        .onConflictDoUpdate({ target: bookYjsState.bookId, set: { state: Buffer.from(yState) as any, updatedAt: new Date() } });
    return id;
}

async function upsertAssignment(bookId: string, userId: string, role: Role) {
    await db.insert(assignment).values({ bookId, userId, role })
        .onConflictDoNothing();
}

function actorByEmail(spec: SeedBook, email: string, idByEmail: Map<string, string>, userByEmail: Map<string, SeedUser>): SeedActor {
    const uid = idByEmail.get(email);
    const u = userByEmail.get(email);
    if (!uid || !u) {
        throw new Error(`[seed] missing actor for ${email}`);
    }
    const assignedRole = spec.assignments.find((a) => a.email === email)?.role;
    const role: Role = assignedRole ?? (u.isCoordinator ? 'coordinator' : 'editor');
    return { id: uid, name: u.name, role, color: u.color };
}

function buildSeedThreads(spec: SeedBook, idByEmail: Map<string, string>, userByEmail: Map<string, SeedUser>): SeedThread[] {
    const editorEmail = spec.assignments.find((a) => a.role === 'editor')?.email ?? spec.ownerEmail;
    const proofEmail = spec.assignments.find((a) => a.role === 'proofreader')?.email ?? editorEmail;
    const authorEmail = spec.assignments.find((a) => a.role === 'author')?.email ?? spec.ownerEmail;
    const translatorEmail = spec.assignments.find((a) => a.role === 'translator')?.email ?? editorEmail;
    const coordinatorEmail = spec.ownerEmail;

    const editor = actorByEmail(spec, editorEmail, idByEmail, userByEmail);
    const proof = actorByEmail(spec, proofEmail, idByEmail, userByEmail);
    const author = actorByEmail(spec, authorEmail, idByEmail, userByEmail);
    const translator = actorByEmail(spec, translatorEmail, idByEmail, userByEmail);
    const coordinator = actorByEmail(spec, coordinatorEmail, idByEmail, userByEmail);

    return [
        {
            id: `seed-${spec.slug}-open-style`,
            anchorId: `seed-anchor-${spec.slug}-open-style`,
            author: proof,
            targetRole: 'editor',
            originalQuote: 'Centralny akapit roboczy wymaga decyzji redaktora.',
            body: 'Ten akapit jest dobrym miejscem na decyzję redakcyjną: zostawiamy jako przejście czy skracamy do jednego zdania?',
            minutesAgo: 180,
            status: 'open',
            replies: [
                {
                    author: editor,
                    body: 'Zostawię sens, ale skrócę rytm i usunę powtórzenie.',
                    minutesAgo: 150,
                },
                {
                    author: author,
                    body: 'Zależy mi na tonie eseistycznym, ale zgadzam się na krótszą wersję.',
                    minutesAgo: 120,
                },
            ],
        },
        {
            id: `seed-${spec.slug}-open-source`,
            anchorId: `seed-anchor-${spec.slug}-open-source`,
            author: editor,
            targetRole: 'author',
            originalQuote: 'Ten fragment powinien mieć potwierdzone źródło.',
            body: 'Potrzebuję źródła przed zamknięciem redakcji. Bez tego fragment zostaje oznaczony jako ryzyko do składu.',
            minutesAgo: 150,
            status: 'open',
            replies: [
                {
                    author,
                    body: 'Sprawdzę notatki i podeślę pełny opis bibliograficzny.',
                    minutesAgo: 90,
                },
            ],
        },
        {
            id: `seed-${spec.slug}-open-term`,
            anchorId: `seed-anchor-${spec.slug}-open-term`,
            author: translator,
            targetRole: 'editor',
            originalQuote: 'Termin roboczy pozostaje niespójny w całym rozdziale.',
            body: 'Proszę o decyzję terminologiczną. Po decyzji mogę przejść przez cały tekst i ujednolicić wystąpienia.',
            minutesAgo: 125,
            status: 'open',
            replies: [
                {
                    author: editor,
                    body: 'Wybierzmy wariant prostszy dla czytelnika, a techniczny dopiszmy w glosariuszu.',
                    minutesAgo: 80,
                },
                {
                    author: proof,
                    body: 'Po decyzji sprawdzę odmianę i podpisy ilustracji.',
                    minutesAgo: 50,
                },
            ],
        },
        {
            id: `seed-${spec.slug}-open-shortening`,
            anchorId: `seed-anchor-${spec.slug}-open-shortening`,
            author: proof,
            targetRole: 'editor',
            originalQuote: 'To zdanie jest zbyt długie i wymaga skrócenia.',
            body: 'Sugeruję podział na dwa zdania. Obecny zapis utrudnia korektę interpunkcji i rytmu.',
            minutesAgo: 95,
            status: 'open',
            replies: [
                {
                    author: editor,
                    body: 'Zrobię podział po sprawdzeniu, czy nie gubimy puenty akapitu.',
                    minutesAgo: 65,
                },
            ],
        },
        {
            id: `seed-${spec.slug}-resolved-context`,
            anchorId: `seed-anchor-${spec.slug}-resolved-context`,
            author: coordinator,
            targetRole: 'editor',
            originalQuote: 'W tym miejscu autor dopowiada kontekst dla korekty.',
            body: 'Ustalone: zostawiamy kontekst, ale bez rozbudowywania przypisu w tej wersji.',
            minutesAgo: 300,
            status: 'resolved',
            resolvedBy: coordinator.name,
            resolvedMinutesAgo: 90,
            replies: [
                {
                    author: editor,
                    body: 'Wprowadzone. Korekta może sprawdzić tylko zapis nazw własnych.',
                    minutesAgo: 100,
                },
            ],
        },
        {
            id: `seed-${spec.slug}-open-coordination`,
            anchorId: `seed-anchor-${spec.slug}-open-coordination`,
            author: coordinator,
            targetRole: 'proofreader',
            originalQuote: 'Po akceptacji wersji końcowej trzeba uruchomić wyszukiwanie i ujednolicić wszystkie wystąpienia.',
            body: 'To zadanie zostaje na koniec etapu. Dajcie znać, czy potrzebujemy dodatkowej rundy po eksporcie DOCX.',
            minutesAgo: 60,
            status: 'open',
            replies: [
                {
                    author: proof,
                    body: 'Wystarczy jedna runda, jeśli glosariusz będzie zamknięty przed korektą.',
                    minutesAgo: 35,
                },
            ],
        },
    ];
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
    // Remove existing comments for this book in idempotent re-seeds.
    const existing = await db.select({ id: commentThread.id }).from(commentThread).where(eq(commentThread.bookId, bookId));
    for (const row of existing) {
        await db.delete(commentMessage).where(eq(commentMessage.threadId, row.id));
    }
    await db.delete(commentThread).where(eq(commentThread.bookId, bookId));

    const now = Date.now();
    for (const t of threads) {
        const createdAt = new Date(now - t.minutesAgo * 60_000);
        const resolvedAt = t.status === 'resolved' && t.resolvedMinutesAgo !== undefined
            ? new Date(now - t.resolvedMinutesAgo * 60_000)
            : null;
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
        void resolvedAt;
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

    // Load actual ids assigned by BetterAuth (not deterministic seed ids)
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
            Y.applyUpdate(doc, new Uint8Array(yState[0].state as any));
            applyThreadsToYDoc(doc, threads);
            const markedDoc = applyThreadMarksToYDoc(doc, threads);
            await db.update(bookYjsState).set({
                state: Buffer.from(Y.encodeStateAsUpdate(markedDoc)) as any,
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
