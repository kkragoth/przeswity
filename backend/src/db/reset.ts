import 'dotenv/config';
import { Pool } from 'pg';
import { env } from '../env.js';

const pool = new Pool({ connectionString: env.DATABASE_URL });
await pool.query(`
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO przeswity;
    GRANT ALL ON SCHEMA public TO public;
`);
await pool.end();
console.log('database reset');
