import 'dotenv/config';
import { Pool } from 'pg';
import { env } from '../env.js';
import { log } from '../lib/log.js';

const pool = new Pool({ connectionString: env.DATABASE_URL });
await pool.query(`
    DROP SCHEMA IF EXISTS public CASCADE;
    DROP SCHEMA IF EXISTS drizzle CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO przeswity;
    GRANT ALL ON SCHEMA public TO public;
`);
await pool.end();
log.info('database reset');
