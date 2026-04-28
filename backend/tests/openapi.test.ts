import { describe, it, expect } from 'vitest';
import { registry, buildOpenApi } from '../src/openapi/registry';

describe('openapi', () => {
    it('every registered path has an operationId', () => {
        const pathDefs = registry.definitions.filter((d: any) => d.type === 'route');
        for (const d of pathDefs as any[]) {
            expect(d.route?.operationId, `path ${d.route?.method} ${d.route?.path} missing operationId`).toBeTruthy();
        }
    });

    it('buildOpenApi produces a valid 3.1 doc', () => {
        const doc = buildOpenApi();
        expect(doc.openapi).toBe('3.1.0');
        expect(doc.info?.title).toBe('Prześwity API');
    });
});
