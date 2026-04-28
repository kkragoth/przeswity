import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
export default defineConfig({
    test: {
        environment: 'node',
        // Tests share a single database; run files sequentially to avoid FK conflicts on auth tables
        fileParallelism: false,
        sequence: { concurrent: false },
    },
});
