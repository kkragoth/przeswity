import 'dotenv/config';
import { pool } from '../db/client.js';
import { log } from '../lib/log.js';
import { seedUsers } from './seedUsers.js';
import { seedBooks } from './seedBooks.js';

export async function seedAll(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('[seed] refusing to run dev seed in production');
    }
    log.info('seed starting');
    const { idByEmail, userByEmail } = await seedUsers();
    await seedBooks(idByEmail, userByEmail);
    log.info('seed complete');
}

if (import.meta.url === `file://${process.argv[1]}`) {
    await seedAll();
    await pool.end();
}
