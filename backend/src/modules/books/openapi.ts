import { z } from 'zod';
import { registry } from '../../openapi/registry.js';
import {
    BookDto, BookSummaryDto, CreateBookBody, UpdateBookBody,
    PatchBookStageBody, PatchBookProgressBody, BookStageHistoryDto,
} from './schemas.js';

const idParams = z.object({ id: z.string() });
const bookResp = { 'application/json': { schema: BookDto } };

export function registerBookRoutes(): void {
    registry.registerPath({
        method: 'get', path: '/api/books', operationId: 'booksList',
        responses: { 200: { description: 'list', content: { 'application/json': { schema: z.array(BookSummaryDto) } } } },
    });
    registry.registerPath({
        method: 'get', path: '/api/books/{id}', operationId: 'bookGet',
        request: { params: idParams },
        responses: { 200: { description: 'book', content: bookResp } },
    });
    registry.registerPath({
        method: 'post', path: '/api/books', operationId: 'bookCreate',
        request: { body: { content: { 'application/json': { schema: CreateBookBody } } } },
        responses: { 200: { description: 'created', content: bookResp } },
    });
    registry.registerPath({
        method: 'patch', path: '/api/books/{id}', operationId: 'bookPatch',
        request: { params: idParams, body: { content: { 'application/json': { schema: UpdateBookBody } } } },
        responses: { 200: { description: 'updated', content: bookResp } },
    });
    registry.registerPath({
        method: 'delete', path: '/api/books/{id}', operationId: 'bookDelete',
        request: { params: idParams },
        responses: { 204: { description: 'deleted' } },
    });
    registry.registerPath({
        method: 'patch', path: '/api/books/{id}/stage', operationId: 'bookPatchStage',
        request: { params: idParams, body: { content: { 'application/json': { schema: PatchBookStageBody } } } },
        responses: { 200: { description: 'updated', content: bookResp } },
    });
    registry.registerPath({
        method: 'patch', path: '/api/books/{id}/progress', operationId: 'bookPatchProgress',
        request: { params: idParams, body: { content: { 'application/json': { schema: PatchBookProgressBody } } } },
        responses: { 200: { description: 'updated', content: bookResp } },
    });
    registry.registerPath({
        method: 'get', path: '/api/books/{id}/stage-history', operationId: 'bookStageHistory',
        request: { params: idParams },
        responses: { 200: { description: 'history', content: { 'application/json': { schema: z.array(BookStageHistoryDto) } } } },
    });
    registry.registerPath({
        method: 'get', path: '/api/books/{id}/markdown', operationId: 'bookMarkdown',
        request: { params: idParams },
        responses: { 200: { description: 'canonical markdown', content: { 'text/markdown': { schema: z.string() } } } },
    });
    registry.registerPath({
        method: 'get', path: '/api/books/{id}/snapshots/{snapId}/markdown', operationId: 'bookSnapshotMarkdown',
        request: { params: z.object({ id: z.string(), snapId: z.string() }) },
        responses: { 200: { description: 'snapshot markdown', content: { 'text/markdown': { schema: z.string() } } } },
    });
    registry.registerPath({
        method: 'get', path: '/api/books/{id}/presence', operationId: 'bookPresence',
        request: { params: idParams },
        responses: { 200: { description: 'presence', content: { 'application/json': { schema: z.object({ users: z.array(z.object({ id: z.string(), name: z.string(), color: z.string() })) }) } } } },
    });
}

registerBookRoutes();
