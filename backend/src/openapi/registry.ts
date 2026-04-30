import { OpenAPIRegistry, OpenApiGeneratorV31, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { env } from '../env.js';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

export function buildOpenApi() {
    const generator = new OpenApiGeneratorV31(registry.definitions);
    return generator.generateDocument({
        openapi: '3.1.0',
        info: { title: 'Prześwity API', version: '0.1.0' },
        servers: [{ url: env.PUBLIC_API_URL }],
    });
}
