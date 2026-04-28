import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { seedAll } from '../src/seed/seed';
import { db, pool } from '../src/db/client';
import { user, book, assignment, bookYjsState } from '../src/db/schema';

describe('seed idempotency', () => {
    beforeAll(async () => {
        await db.delete(assignment);
        await db.delete(bookYjsState);
        await db.delete(book);
        await db.delete(user);
    });

    afterAll(async () => {
        await db.delete(assignment);
        await db.delete(bookYjsState);
        await db.delete(book);
        await db.delete(user);
        await pool.end();
    });

    it('runs twice without duplicates', async () => {
        await seedAll();
        const usersAfter1 = await db.select().from(user);
        const booksAfter1 = await db.select().from(book);
        const assAfter1 = await db.select().from(assignment);
        const yAfter1 = await db.select().from(bookYjsState);

        await seedAll();
        const usersAfter2 = await db.select().from(user);
        const booksAfter2 = await db.select().from(book);
        const assAfter2 = await db.select().from(assignment);
        const yAfter2 = await db.select().from(bookYjsState);

        expect(usersAfter2.length).toBe(usersAfter1.length);
        expect(booksAfter2.length).toBe(booksAfter1.length);
        expect(assAfter2.length).toBe(assAfter1.length);
        expect(yAfter2.length).toBe(yAfter1.length);
        expect(usersAfter2.length).toBe(9); // 1 admin + 2 coord + 6 contributors
        expect(booksAfter2.length).toBe(4);
    }, 60_000);
});
