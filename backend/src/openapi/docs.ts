import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';
import { buildOpenApi } from './registry.js';

export const docsRouter = Router();

docsRouter.get('/openapi.json', (_req, res) => res.json(buildOpenApi()));
docsRouter.use('/docs', swaggerUi.serve, swaggerUi.setup(undefined, {
    swaggerOptions: { url: '/openapi.json' },
}));
