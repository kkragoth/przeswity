// Read-only audit. Run before applying CHECK constraints in Phase 5 of the backend
// refactor (see doc/refactor-backend.md). Reports counts of rows that would fail the
// constraints; exits 0 when clean, 1 when bad rows exist (so it can gate CI/deploy).
//
// Usage: npx tsx scripts/audit-stage-progress.ts

import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db, pool } from '../src/db/client.js';
import { BOOK_STAGES, PROGRESS_MODES } from '../src/modules/books/workflow.js';

type AuditRow = { check: string; count: number; sample?: unknown[] };

async function audit(): Promise<AuditRow[]> {
    const stages = BOOK_STAGES as readonly string[];
    const modes = PROGRESS_MODES as readonly string[];
    const results: AuditRow[] = [];

    const badStage = await db.execute<{ id: string; stage: string }>(sql`
        SELECT id, stage FROM book WHERE stage NOT IN (${sql.join(stages.map((s) => sql`${s}`), sql`, `)})
        LIMIT 20
    `);
    results.push({ check: 'book.stage NOT IN BOOK_STAGES', count: badStage.rows.length, sample: badStage.rows });

    const badMode = await db.execute<{ id: string; progress_mode: string }>(sql`
        SELECT id, progress_mode FROM book WHERE progress_mode NOT IN (${sql.join(modes.map((s) => sql`${s}`), sql`, `)})
        LIMIT 20
    `);
    results.push({ check: 'book.progress_mode NOT IN PROGRESS_MODES', count: badMode.rows.length, sample: badMode.rows });

    const badProgress = await db.execute<{ id: string; progress: number }>(sql`
        SELECT id, progress FROM book WHERE progress < 0 OR progress > 100 LIMIT 20
    `);
    results.push({ check: 'book.progress NOT BETWEEN 0 AND 100', count: badProgress.rows.length, sample: badProgress.rows });

    const orphanCreator = await db.execute<{ id: string; created_by_id: string }>(sql`
        SELECT b.id, b.created_by_id FROM book b
        LEFT JOIN "user" u ON u.id = b.created_by_id
        WHERE u.id IS NULL LIMIT 20
    `);
    results.push({ check: 'book.created_by_id has no user', count: orphanCreator.rows.length, sample: orphanCreator.rows });

    return results;
}

audit().then((rows) => {
    let bad = 0;
    for (const r of rows) {
        const status = r.count === 0 ? 'OK' : 'BAD';
        console.log(`[${status}] ${r.check}: ${r.count}`);
        if (r.count > 0) {
            console.log('  sample:', JSON.stringify(r.sample, null, 2));
            bad++;
        }
    }
    pool.end().then(() => process.exit(bad === 0 ? 0 : 1));
}).catch((err) => {
    console.error('audit failed', err);
    pool.end().then(() => process.exit(2));
});
