import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { db, pool } from '../db/client.js';
import { user, book, assignment, bookYjsState } from '../db/schema.js';
import { auth } from '../auth/betterAuth.js';
import { DEV_PASSWORD } from './devPassword.js';
import { seedBookId } from './ids.js';
import { markdownToYDocState } from '@przeswity/editor-schema/markdown';

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
    const yState = markdownToYDocState(md);
    await db.insert(bookYjsState).values({ bookId: id, state: Buffer.from(yState) as any })
        .onConflictDoUpdate({ target: bookYjsState.bookId, set: { state: Buffer.from(yState) as any, updatedAt: new Date() } });
    return id;
}

async function upsertAssignment(bookId: string, userId: string, role: Role) {
    await db.insert(assignment).values({ bookId, userId, role })
        .onConflictDoNothing();
}

export async function seedAll() {
    console.log('[seed] starting…');
    for (const u of USERS) {
        await upsertSeedUser(u);
        console.log(`[seed] user ${u.email}`);
    }

    // Load actual ids assigned by BetterAuth (not deterministic seed ids)
    const allUsers = await db.select().from(user);
    const idByEmail = new Map(allUsers.map((u) => [u.email, u.id]));

    for (const b of BOOKS) {
        const ownerId = idByEmail.get(b.ownerEmail);
        if (!ownerId) { console.warn(`[seed] no owner found for ${b.slug}`); continue; }
        const bookId = await upsertSeedBook(b, ownerId);
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
