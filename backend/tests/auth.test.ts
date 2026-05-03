import { describe, it, expect } from 'vitest';
import { auth } from '../src/auth/betterAuth.config';

describe('better-auth config', () => {
    it('has email-password enabled', () => {
        expect(auth.options.emailAndPassword?.enabled).toBe(true);
    });
    it('has additionalFields configured', () => {
        const fields = auth.options.user?.additionalFields;
        expect(fields).toBeDefined();
        expect(fields?.systemRole).toBeDefined();
        expect(fields?.preferredLocale).toBeDefined();
        expect(fields?.isSystem).toBeDefined();
    });
});
