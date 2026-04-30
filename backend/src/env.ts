import { z } from 'zod';
import 'dotenv/config';

const Schema = z.object({
    // NODE_ENV has no default — production deploys MUST set it explicitly. Dev compose sets it to "development".
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().default(8080),
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    CORS_ORIGINS: z.string().transform((s) => s.split(',').map((x) => x.trim())),
    COOKIE_DOMAIN: z.string().default(''),
    // z.coerce.boolean() is JS Boolean() coercion — 'false' → true. Use string compare instead.
    COOKIE_SECURE: z.string().default('false').transform((s) => s.toLowerCase() === 'true'),
    PUBLIC_API_URL: z.string().url(),
    COLLAB_PATH: z.string().default('/collaboration'),
    ENABLE_DEV_AUTH: z.string().default('false').transform((s) => s.toLowerCase() === 'true'),
    // Presence API exposes a process-local Map. In multi-process deployments set to 'false'
    // and the endpoint returns 501. See INVARIANT in collab/server.ts.
    PRESENCE_API_ENABLED: z.string().default('true').transform((s) => s.toLowerCase() === 'true'),
});

export const env = Schema.parse(process.env);
export type Env = typeof env;
