import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
// Tests assume the AI stub provider is wired so /api/ai/* returns canned suggestions.
// Production defaults to 'none' (501) — see env.ts.
process.env.AI_PROVIDER = process.env.AI_PROVIDER ?? 'stub';
export default defineConfig({
    test: {
        environment: 'node',
        // Tests share a single database; run files sequentially to avoid FK conflicts on auth tables
        fileParallelism: false,
        sequence: { concurrent: false },
    },
});
