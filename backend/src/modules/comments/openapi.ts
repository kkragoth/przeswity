import { z } from 'zod';
import { registry } from '../../openapi/registry.js';
import {
    CommentThreadDto,
    CreateThreadBody,
    CreateReplyBody,
    EditMessageBody,
    ResolveBody,
    CommentsListQuery,
} from './schemas.js';

const bookIdParams = z.object({ bookId: z.string() });
const threadIdParams = z.object({ threadId: z.string() });
const messageIdParams = z.object({ threadId: z.string(), messageId: z.string() });
const threadResponse = { 'application/json': { schema: CommentThreadDto } };

export function registerCommentRoutes(): void {
    registry.registerPath({
        method: 'get', path: '/api/books/{bookId}/comments', operationId: 'commentsList',
        request: { params: bookIdParams, query: CommentsListQuery },
        responses: { 200: { description: 'list', content: { 'application/json': { schema: z.array(CommentThreadDto) } } } },
    });
    registry.registerPath({
        method: 'post', path: '/api/books/{bookId}/comments', operationId: 'commentCreate',
        request: { params: bookIdParams, body: { content: { 'application/json': { schema: CreateThreadBody } } } },
        responses: { 200: { description: 'created', content: threadResponse } },
    });
    registry.registerPath({
        method: 'post', path: '/api/comments/{threadId}/messages', operationId: 'commentReply',
        request: { params: threadIdParams, body: { content: { 'application/json': { schema: CreateReplyBody } } } },
        responses: { 200: { description: 'replied', content: threadResponse } },
    });
    registry.registerPath({
        method: 'patch', path: '/api/comments/{threadId}/messages/{messageId}', operationId: 'commentMessageEdit',
        request: { params: messageIdParams, body: { content: { 'application/json': { schema: EditMessageBody } } } },
        responses: { 200: { description: 'edited', content: threadResponse } },
    });
    registry.registerPath({
        method: 'post', path: '/api/comments/{threadId}/resolve', operationId: 'commentResolve',
        request: { params: threadIdParams, body: { content: { 'application/json': { schema: ResolveBody } } } },
        responses: { 200: { description: 'resolved', content: threadResponse } },
    });
    registry.registerPath({
        method: 'delete', path: '/api/comments/{threadId}/messages/{messageId}', operationId: 'commentMessageDelete',
        request: { params: messageIdParams },
        responses: { 200: { description: 'deleted or thread removed' } },
    });
    registry.registerPath({
        method: 'patch', path: '/api/comments/{threadId}/detach', operationId: 'commentThreadDetach',
        request: { params: threadIdParams },
        responses: { 200: { description: 'detached', content: threadResponse } },
    });
    registry.registerPath({
        method: 'patch', path: '/api/comments/{threadId}/reattach', operationId: 'commentThreadReattach',
        request: { params: threadIdParams },
        responses: { 200: { description: 'reattached', content: threadResponse } },
    });
    registry.registerPath({
        method: 'delete', path: '/api/comments/{threadId}', operationId: 'commentThreadDelete',
        request: { params: threadIdParams },
        responses: { 204: { description: 'deleted' } },
    });
}

registerCommentRoutes();
