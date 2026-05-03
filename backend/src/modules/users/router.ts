import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { user } from '../../db/schema.js';
import { auth } from '../../auth/betterAuth.config.js';
import { requireSession, requireAdmin, requireProjectManager, authedHandler } from '../../auth/session.js';
import { asyncHandler, AppError } from '../../lib/errors.js';
import { registry } from '../../openapi/registry.js';
import { UserDto, MeDto, CreateUserBody, UpdateUserBody, PatchMeBody, UsersListQuery } from './schemas.js';
import { projectUser, buildMeResponse, listUsersPaginated } from './service.js';

export const usersRouter = Router();

registry.registerPath({
    method: 'get', path: '/api/users', operationId: 'usersList',
    responses: { 200: { description: 'list', content: { 'application/json': { schema: z.array(UserDto) } } } },
});
registry.registerPath({
    method: 'post', path: '/api/users', operationId: 'userCreate',
    request: { body: { content: { 'application/json': { schema: CreateUserBody } } } },
    responses: { 200: { description: 'created', content: { 'application/json': { schema: UserDto } } } },
});
registry.registerPath({
    method: 'patch', path: '/api/users/{id}', operationId: 'userPatch',
    request: { params: z.object({ id: z.string() }), body: { content: { 'application/json': { schema: UpdateUserBody } } } },
    responses: { 200: { description: 'updated', content: { 'application/json': { schema: UserDto } } } },
});
registry.registerPath({
    method: 'delete', path: '/api/users/{id}', operationId: 'userDelete',
    request: { params: z.object({ id: z.string() }) },
    responses: { 204: { description: 'deleted' } },
});
registry.registerPath({
    method: 'get', path: '/api/me', operationId: 'meGet',
    responses: { 200: { description: 'me', content: { 'application/json': { schema: MeDto } } } },
});
registry.registerPath({
    method: 'patch', path: '/api/me', operationId: 'mePatch',
    request: { body: { content: { 'application/json': { schema: PatchMeBody } } } },
    responses: { 200: { description: 'me updated', content: { 'application/json': { schema: MeDto } } } },
});

usersRouter.get('/api/users', requireSession, requireProjectManager, asyncHandler(async (req, res) => {
    const q = UsersListQuery.parse(req.query);
    res.json(await listUsersPaginated(q.limit, q.offset));
}));

usersRouter.post('/api/users', requireSession, requireProjectManager, authedHandler(async (req, res) => {
    const body = CreateUserBody.parse(req.body);
    const me = req.user;
    if (body.systemRole === 'admin' && me.systemRole !== 'admin') {
        throw new AppError('errors.auth.forbidden', 403, 'only admins can create admin users');
    }
    try {
        await auth.api.signUpEmail({ body: { email: body.email, password: body.password, name: body.name }, asResponse: true });
    } catch (e: unknown) {
        const code = (e as { body?: { code?: string }; cause?: { code?: string } } | null)?.body?.code
            ?? (e as { cause?: { code?: string } } | null)?.cause?.code
            ?? '';
        if (code === 'USER_ALREADY_EXISTS') {
            throw new AppError('errors.user.duplicate', 409, 'user already exists');
        }
        throw e;
    }
    await db.update(user)
        .set({ systemRole: body.systemRole, competencyTags: body.competencyTags })
        .where(eq(user.email, body.email));
    const [u] = await db.select().from(user).where(eq(user.email, body.email));
    res.json(projectUser(u));
}));

usersRouter.patch('/api/users/:id', requireSession, requireAdmin, authedHandler(async (req, res) => {
    const body = UpdateUserBody.parse(req.body);
    const update: Partial<typeof user.$inferInsert> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.systemRole !== undefined) update.systemRole = body.systemRole;
    if (body.competencyTags !== undefined) update.competencyTags = body.competencyTags;
    if (body.color !== undefined) update.color = body.color;
    if (Object.keys(update).length === 0) throw new AppError('errors.validation.empty', 400, 'no changes');
    update.updatedAt = new Date();
    const updated = await db.update(user).set(update).where(eq(user.id, req.params.id)).returning();
    if (updated.length === 0) throw new AppError('errors.user.notFound', 404, 'user not found');
    res.json(projectUser(updated[0]));
}));

usersRouter.delete('/api/users/:id', requireSession, requireAdmin, authedHandler(async (req, res) => {
    const deleted = await db.delete(user).where(eq(user.id, req.params.id)).returning({ id: user.id });
    if (deleted.length === 0) throw new AppError('errors.user.notFound', 404, 'user not found');
    res.status(204).end();
}));

usersRouter.get('/api/me', requireSession, authedHandler(async (req, res) => {
    res.json(await buildMeResponse(req.user.id));
}));

usersRouter.patch('/api/me', requireSession, authedHandler(async (req, res) => {
    const body = PatchMeBody.parse(req.body);
    const userId = req.user.id;
    const update: Partial<typeof user.$inferInsert> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.color !== undefined) update.color = body.color;
    if (body.image !== undefined) update.image = body.image ?? null;
    if (body.preferredLocale !== undefined) update.preferredLocale = body.preferredLocale;
    if (body.onboardingDismissedAt !== undefined) {
        update.onboardingDismissedAt = body.onboardingDismissedAt === 'now' ? new Date().toISOString() : '';
    }
    if (Object.keys(update).length === 0) throw new AppError('errors.validation.empty', 400, 'no changes');
    update.updatedAt = new Date();
    await db.update(user).set(update).where(eq(user.id, userId));
    res.json(await buildMeResponse(userId));
}));
