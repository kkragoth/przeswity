import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app';

// INVARIANT: BetterAuth's wildcard handler MUST run before express.json() because it parses
// its own bodies. The dev auth router MUST mount before the wildcard so its concrete paths
// aren't swallowed. cookie-parser MUST come before any auth handling. If any future refactor
// reorders middleware in app.ts, this test fails first and prevents the regression.
describe('app middleware order', () => {
    it('mounts cookie-parser, dev auth, better-auth wildcard, then express.json, then module routers', async () => {
        const app = await buildApp();
        const stack = (app as any)._router.stack as Array<{
            name: string;
            regexp?: RegExp;
            route?: any;
            handle?: any;
        }>;

        const layerKind = (l: typeof stack[number]): string => {
            if (l.name === 'cookieParser') return 'cookieParser';
            if (l.name === 'jsonParser') return 'jsonParser';
            if (l.name === 'corsMiddleware' || l.name === 'cors') return 'cors';
            if (l.route && l.regexp?.toString().includes('api\\/auth')) return 'betterAuthWildcard';
            if (l.name === 'router' && l.handle?.stack) {
                const paths: string[] = l.handle.stack.map((s: any) => s.route?.path).filter(Boolean);
                if (paths.some((p) => p.startsWith('/api/auth/dev/'))) return 'devAuthRouter';
                if (paths.some((p) => p.startsWith('/api/books'))) return 'booksRouter';
            }
            return l.name;
        };
        const kinds = stack.map(layerKind);

        const idx = (k: string) => kinds.indexOf(k);
        expect(idx('cookieParser')).toBeGreaterThanOrEqual(0);
        expect(idx('betterAuthWildcard')).toBeGreaterThanOrEqual(0);
        expect(idx('jsonParser')).toBeGreaterThanOrEqual(0);
        expect(idx('booksRouter')).toBeGreaterThanOrEqual(0);

        expect(idx('cookieParser')).toBeLessThan(idx('betterAuthWildcard'));
        expect(idx('cookieParser')).toBeLessThan(idx('jsonParser'));
        if (idx('devAuthRouter') >= 0) {
            expect(idx('devAuthRouter')).toBeLessThan(idx('betterAuthWildcard'));
        }
        expect(idx('betterAuthWildcard')).toBeLessThan(idx('jsonParser'));
        expect(idx('jsonParser')).toBeLessThan(idx('booksRouter'));
    });
});
