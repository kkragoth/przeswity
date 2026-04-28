import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/client.js';
import * as schema from '../db/schema.js';
import { env } from '../env.js';

export const auth = betterAuth({
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    emailAndPassword: { enabled: true, autoSignIn: true },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: env.CORS_ORIGINS,
    advanced: {
        cookiePrefix: 'przeswity',
        useSecureCookies: env.COOKIE_SECURE,
        defaultCookieAttributes: { sameSite: 'lax', ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}) },
    },
    user: {
        additionalFields: {
            systemRole: { type: 'string', defaultValue: null, input: false },
            competencyTags: { type: 'string[]', defaultValue: [], input: false },
            color: { type: 'string', defaultValue: '#7c3aed', input: false },
            preferredLocale: { type: 'string', defaultValue: 'pl', input: false },
            onboardingDismissedAt: { type: 'string', defaultValue: '', input: false },
            isSystem: { type: 'boolean', defaultValue: false, input: false },
        },
    },
});
