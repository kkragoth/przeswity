// Integration tests for the full interceptor (retry loop, redirect) are warranted but require heavy mocking — tracked as a follow-up.
import { describe, it, expect } from 'vitest';
import { buildLoginRedirectUrl } from '@/api/interceptors';

describe('buildLoginRedirectUrl', () => {
    it('encodes spaces in pathname', () => {
        expect(buildLoginRedirectUrl('/foo bar', '')).toBe('/login?next=%2Ffoo%20bar');
    });

    it('includes search string in next param', () => {
        expect(buildLoginRedirectUrl('/foo', '?x=1')).toBe('/login?next=%2Ffoo%3Fx%3D1');
    });

    it('handles empty pathname', () => {
        expect(buildLoginRedirectUrl('', '')).toBe('/login?next=');
    });
});
