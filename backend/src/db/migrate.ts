import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { env } from '../env.js';
import { log } from '../lib/log.js';

const pool = new Pool({ connectionString: env.DATABASE_URL });
const db = drizzle(pool);
await migrate(db, { migrationsFolder: './src/db/migrations' });
await pool.end();
log.info('migrations complete');
