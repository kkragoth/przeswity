import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Y from 'yjs';
import { db } from '../db/client.js';
import { book, assignment, bookYjsState } from '../db/schema.js';
import { seedBookId } from './ids.js';
import { markdownToYDocState } from '@przeswity/editor-schema/markdown';
import { asByteaInput } from '../lib/bytes.js';
import { log } from '../lib/log.js';
import { BOOKS } from './data/books.js';
import { buildSeedThreads } from './data/threads.js';
import { reseedBookComments, applyThreadsToBookYjs } from './seedThreads.js';
import type { Role, SeedBook, SeedUser } from './data/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fix = (name: string) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

async function upsertSeedBook(spec: SeedBook, ownerId: string): Promise<string> {
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

    const seededBytes = asByteaInput(Y.encodeStateAsUpdate(seededDoc));
    const initialBytes = asByteaInput(yState);
    await db.insert(bookYjsState).values({ bookId: id, state: seededBytes, sizeBytes: seededBytes.byteLength })
        .onConflictDoUpdate({
            target: bookYjsState.bookId,
            set: { state: initialBytes, sizeBytes: initialBytes.byteLength, updatedAt: new Date() },
        });
    return id;
}

async function upsertAssignment(bookId: string, userId: string, role: Role): Promise<void> {
    await db.insert(assignment).values({ bookId, userId, role }).onConflictDoNothing();
}

export async function seedBooks(idByEmail: Map<string, string>, userByEmail: Map<string, SeedUser>): Promise<void> {
    for (const b of BOOKS) {
        const ownerId = idByEmail.get(b.ownerEmail);
        if (!ownerId) { log.warn('seed: missing owner', { slug: b.slug, ownerEmail: b.ownerEmail }); continue; }
        const bookId = await upsertSeedBook(b, ownerId);
        const threads = buildSeedThreads(b, idByEmail, userByEmail);
        await applyThreadsToBookYjs(bookId, threads);
        await reseedBookComments(bookId, threads);
        for (const a of b.assignments) {
            const uid = idByEmail.get(a.email);
            if (!uid) { log.warn('seed: missing assignee', { slug: b.slug, email: a.email }); continue; }
            await upsertAssignment(bookId, uid, a.role);
        }
        log.info('seed book upserted', { slug: b.slug, bookId });
    }
}
