import { z } from 'zod';
import 'dotenv/config';

const Schema = z.object({
    // NODE_ENV has no default — production deploys MUST set it explicitly. Dev compose sets it to "development".
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().default(8080),
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    // Validated below — array length ≥1 and no '*' (we send credentials, browsers reject wildcard).
    CORS_ORIGINS: z.string().transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean)),
    COOKIE_DOMAIN: z.string().default(''),
    // z.coerce.boolean() is JS Boolean() coercion — 'false' → true. Use string compare instead.
    COOKIE_SECURE: z.string().default('false').transform((s) => s.toLowerCase() === 'true'),
    PUBLIC_API_URL: z.string().url(),
    COLLAB_PATH: z.string().default('/collaboration'),
    ENABLE_DEV_AUTH: z.string().default('false').transform((s) => s.toLowerCase() === 'true'),
    // Presence API exposes a process-local Map. In multi-process deployments set to 'false'
    // and the endpoint returns 501. See INVARIANT in collab/server.ts.
    PRESENCE_API_ENABLED: z.string().default('true').transform((s) => s.toLowerCase() === 'true'),
    // Required by seed and dev-auth flows. Refused in production via the refine below.
    DEV_SEED_PASSWORD: z.string().min(8).optional(),
    // 'none' (default) returns 501 from /api/ai/*. 'stub' returns the canned suggestions
    // used by the editor in development. Real provider hookup lands behind a third value.
    AI_PROVIDER: z.enum(['none', 'stub']).default('none'),
}).superRefine((v, ctx) => {
    if (v.CORS_ORIGINS.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['CORS_ORIGINS'], message: 'CORS_ORIGINS must list at least one origin' });
    }
    if (v.CORS_ORIGINS.includes('*')) {
        ctx.addIssue({ code: 'custom', path: ['CORS_ORIGINS'], message: '"*" is incompatible with credentialed CORS' });
    }
    if (v.NODE_ENV === 'production' && v.ENABLE_DEV_AUTH) {
        ctx.addIssue({ code: 'custom', path: ['ENABLE_DEV_AUTH'], message: 'ENABLE_DEV_AUTH must be false when NODE_ENV=production' });
    }
    if (v.NODE_ENV !== 'production' && v.ENABLE_DEV_AUTH && !v.DEV_SEED_PASSWORD) {
        ctx.addIssue({ code: 'custom', path: ['DEV_SEED_PASSWORD'], message: 'DEV_SEED_PASSWORD is required when ENABLE_DEV_AUTH=true' });
    }
});

export const env = Schema.parse(process.env);
export type Env = typeof env;
