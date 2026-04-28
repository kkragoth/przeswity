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
    COOKIE_SECURE: z.coerce.boolean(),
    PUBLIC_API_URL: z.string().url(),
    COLLAB_PATH: z.string().default('/collaboration'),
    ENABLE_DEV_AUTH: z.coerce.boolean().default(false),
});

export const env = Schema.parse(process.env);
export type Env = typeof env;
