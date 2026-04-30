import type { ZodTypeAny } from 'zod';
import { registry } from '../openapi/registry.js';

type HttpMethod = 'get' | 'post' | 'patch' | 'put' | 'delete';

type RouteSpec = {
    method: HttpMethod;
    path: string;
    operationId: string;
    summary?: string;
    params?: ZodTypeAny;
    query?: ZodTypeAny;
    body?: ZodTypeAny;
    bodyContentType?: string; // default 'application/json'
    response?: ZodTypeAny;
    status?: 200 | 201 | 204;
};

// Wraps `registry.registerPath` so every route gets a uniform shape: standardised
// content-type for body + response, optional 204-no-content, single source of truth for
// the OpenAPI envelope. Replaces ~150 LOC of boilerplate across the routers.
export function registerJsonRoute(spec: RouteSpec): void {
    const status = spec.status ?? 200;
    const responseDescription = status === 204 ? 'no content' : 'ok';

    const request: Record<string, unknown> = {};
    if (spec.params) request.params = spec.params;
    if (spec.query) request.query = spec.query;
    if (spec.body) {
        request.body = {
            content: { [spec.bodyContentType ?? 'application/json']: { schema: spec.body } },
        };
    }

    const responseValue = spec.response
        ? { description: responseDescription, content: { 'application/json': { schema: spec.response } } }
        : { description: responseDescription };
    const responseEntry = { [String(status)]: responseValue };

    registry.registerPath({
        method: spec.method,
        path: spec.path,
        operationId: spec.operationId,
        ...(spec.summary ? { summary: spec.summary } : {}),
        request: Object.keys(request).length ? request : undefined,
        responses: responseEntry,
    });
}
