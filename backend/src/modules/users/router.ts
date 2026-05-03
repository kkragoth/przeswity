import { Router } from 'express';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { user, assignment } from '../../db/schema.js';
import { auth } from '../../auth/betterAuth.config.js';
import { requireSession, requireAdmin, requireProjectManager, authedHandler } from '../../auth/session.js';
import { asyncHandler, AppError } from '../../lib/errors.js';
import { registry } from '../../openapi/registry.js';
import { UserDto, MeDto, CreateUserBody, UpdateUserBody, PatchMeBody } from './schemas.js';

export const usersRouter = Router();

registry.registerPath({
    method: 'get', path: '/api/users',
    operationId: 'usersList',
    responses: { 200: { description: 'list', content: { 'application/json': { schema: z.array(UserDto) } } } },
});
registry.registerPath({
    method: 'post', path: '/api/users',
    operationId: 'userCreate',
    request: { body: { content: { 'application/json': { schema: CreateUserBody } } } },
    responses: { 200: { description: 'created', content: { 'application/json': { schema: UserDto } } } },
});
registry.registerPath({
    method: 'patch', path: '/api/users/{id}',
    operationId: 'userPatch',
    request: { params: z.object({ id: z.string() }), body: { content: { 'application/json': { schema: UpdateUserBody } } } },
    responses: { 200: { description: 'updated', content: { 'application/json': { schema: UserDto } } } },
});
registry.registerPath({
    method: 'delete', path: '/api/users/{id}',
    operationId: 'userDelete',
    request: { params: z.object({ id: z.string() }) },
    responses: { 204: { description: 'deleted' } },
});
registry.registerPath({
    method: 'get', path: '/api/me',
    operationId: 'meGet',
    responses: { 200: { description: 'me', content: { 'application/json': { schema: MeDto } } } },
});
registry.registerPath({
    method: 'patch', path: '/api/me',
    operationId: 'mePatch',
    request: { body: { content: { 'application/json': { schema: PatchMeBody } } } },
    responses: { 200: { description: 'me updated', content: { 'application/json': { schema: MeDto } } } },
});

type UserRow = typeof user.$inferSelect;
type UserDtoT = z.infer<typeof UserDto>;
type MeDtoT = z.infer<typeof MeDto>;

const projectUser = (u: UserRow): UserDtoT => ({
    id: u.id,
    email: u.email,
    name: u.name,
    systemRole: (u.systemRole ?? null) as UserDtoT['systemRole'],
    competencyTags: u.competencyTags ?? [],
    color: u.color ?? '#7c3aed',
    image: u.image ?? null,
    preferredLocale: (u.preferredLocale ?? 'pl') as UserDtoT['preferredLocale'],
});

async function buildMeResponse(userId: string): Promise<MeDtoT> {
    const [full] = await db.select().from(user).where(eq(user.id, userId));
    if (!full) throw new AppError('errors.user.notFound', 404, 'user not found');
    // visibleBookCount comes back from SQL; role counts still need each row, but a single
    // query keeps round-trips at one. Distinct vs non-distinct: book_id can repeat across
    // role rows for the same book, so DISTINCT matters here.
    const [counts] = await db.select({
        visibleBookCount: sql<number>`COUNT(DISTINCT ${assignment.bookId})`,
    }).from(assignment).where(eq(assignment.userId, userId));
    const rows = await db.select({ role: assignment.role })
        .from(assignment).where(eq(assignment.userId, userId));
    const assignmentRoleCounts: Record<string, number> = {};
    for (const r of rows) assignmentRoleCounts[r.role] = (assignmentRoleCounts[r.role] ?? 0) + 1;
    return {
        ...projectUser(full),
        visibleBookCount: Number(counts?.visibleBookCount ?? 0),
        assignmentRoleCounts,
        onboardingDismissedAt: full.onboardingDismissedAt ?? '',
    };
}

usersRouter.get('/api/users', requireSession, requireProjectManager, asyncHandler(async (_req, res) => {
    const rows = await db.select().from(user);
    res.json(rows.map(projectUser));
}));

usersRouter.post('/api/users', requireSession, requireProjectManager, authedHandler(async (req, res) => {
    const body = CreateUserBody.parse(req.body);
    const me = req.user;
    // Only admins can create admin users
    if (body.systemRole === 'admin' && me.systemRole !== 'admin') {
        throw new AppError('errors.auth.forbidden', 403, 'only admins can create admin users');
    }
    try {
        await auth.api.signUpEmail({ body: { email: body.email, password: body.password, name: body.name }, asResponse: true });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.toLowerCase().includes('exists')) {
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
