import { eq } from 'drizzle-orm';
import * as Y from 'yjs';
import { db } from '../db/client.js';
import { bookYjsState, bookSnapshot } from '../db/schema.js';
import { asByteaInput } from '../lib/bytes.js';
import { log } from '../lib/log.js';
import type { SeedGlossaryEntry, SeedMeta, SeedSnapshot } from './data/types.js';

async function loadDoc(bookId: string): Promise<Y.Doc | null> {
    const [row] = await db.select({ state: bookYjsState.state })
        .from(bookYjsState).where(eq(bookYjsState.bookId, bookId));
    if (!row?.state) return null;
    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(row.state));
    return doc;
}

async function persistDoc(bookId: string, doc: Y.Doc): Promise<void> {
    const bytes = asByteaInput(Y.encodeStateAsUpdate(doc));
    await db.update(bookYjsState).set({
        state: bytes,
        sizeBytes: bytes.byteLength,
        updatedAt: new Date(),
    }).where(eq(bookYjsState.bookId, bookId));
}

function writeMetaToDoc(doc: Y.Doc, meta: SeedMeta): void {
    const map = doc.getMap('meta');
    map.clear();
    for (const [k, v] of Object.entries(meta)) {
        if (v === undefined || v === null || v === '') continue;
        map.set(k, v);
    }
}

function writeGlossaryToDoc(doc: Y.Doc, entries: SeedGlossaryEntry[]): void {
    const map = doc.getMap('glossary');
    map.clear();
    const now = Date.now();
    for (const e of entries) {
        map.set(e.id, {
            id: e.id,
            term: e.term,
            translation: e.translation,
            notes: e.notes,
            updatedAt: now - e.updatedAtMinutesAgo * 60_000,
        });
    }
}

export async function applyMetaAndGlossary(
    bookId: string,
    meta: SeedMeta,
    glossary: SeedGlossaryEntry[],
): Promise<void> {
    const doc = await loadDoc(bookId);
    if (!doc) return;
    writeMetaToDoc(doc, meta);
    writeGlossaryToDoc(doc, glossary);
    await persistDoc(bookId, doc);
}

/**
 * Replaces all snapshots for a book with the seed-defined set. Each snapshot
 * captures the current Yjs state at insert time — so threads, meta, glossary
 * and rendered prose are all included.
 */
export async function reseedBookSnapshots(
    bookId: string,
    snapshots: SeedSnapshot[],
    idByEmail: Map<string, string>,
): Promise<void> {
    await db.delete(bookSnapshot).where(eq(bookSnapshot.bookId, bookId));
    const [row] = await db.select({ state: bookYjsState.state })
        .from(bookYjsState).where(eq(bookYjsState.bookId, bookId));
    if (!row?.state) return;
    const stateBytes = row.state instanceof Uint8Array ? row.state : new Uint8Array(row.state);
    const now = Date.now();
    for (const s of snapshots) {
        const createdById = idByEmail.get(s.createdByEmail);
        if (!createdById) {
            log.warn('seed: snapshot author missing', { email: s.createdByEmail, label: s.label });
            continue;
        }
        await db.insert(bookSnapshot).values({
            bookId,
            label: s.label,
            state: asByteaInput(stateBytes),
            createdById,
            createdAt: new Date(now - s.minutesAgo * 60_000),
        });
    }
}
