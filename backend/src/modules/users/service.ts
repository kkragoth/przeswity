import { asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/client.js';
import { user, assignment } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import { UserDto, MeDto } from './schemas.js';

export type UserRow = typeof user.$inferSelect;
export type UserDtoT = z.infer<typeof UserDto>;
type MeDtoT = z.infer<typeof MeDto>;

export const projectUser = (u: UserRow): UserDtoT => ({
    id: u.id,
    email: u.email,
    name: u.name,
    systemRole: (u.systemRole ?? null) as UserDtoT['systemRole'],
    competencyTags: u.competencyTags ?? [],
    color: u.color ?? '#7c3aed',
    image: u.image ?? null,
    preferredLocale: (u.preferredLocale ?? 'pl') as UserDtoT['preferredLocale'],
});

export async function listUsersPaginated(limit: number, offset: number): Promise<UserDtoT[]> {
    // Project at SQL level so we don't over-fetch onboardingDismissedAt / emailVerified /
    // isSystem on a list endpoint. limit is bounded at the validator (max 200).
    const rows = await db.select({
        id: user.id, email: user.email, name: user.name, systemRole: user.systemRole,
        competencyTags: user.competencyTags, color: user.color, image: user.image,
        preferredLocale: user.preferredLocale,
    }).from(user).orderBy(asc(user.email)).limit(limit).offset(offset);
    return rows.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        systemRole: (u.systemRole ?? null) as UserDtoT['systemRole'],
        competencyTags: u.competencyTags ?? [],
        color: u.color ?? '#7c3aed',
        image: u.image ?? null,
        preferredLocale: (u.preferredLocale ?? 'pl') as UserDtoT['preferredLocale'],
    }));
}

export async function buildMeResponse(userId: string): Promise<MeDtoT> {
    // Three queries fired in parallel — same wall-clock as a single query in practice
    // and avoids Postgres's `COUNT(DISTINCT ...) OVER ()` (feature not supported, 0A000).
    const [[full], grouped, [counts]] = await Promise.all([
        db.select().from(user).where(eq(user.id, userId)),
        db.select({ role: assignment.role, count: sql<number>`COUNT(*)` })
            .from(assignment).where(eq(assignment.userId, userId)).groupBy(assignment.role),
        db.select({ visibleBookCount: sql<number>`COUNT(DISTINCT ${assignment.bookId})` })
            .from(assignment).where(eq(assignment.userId, userId)),
    ]);
    if (!full) throw new AppError('errors.user.notFound', 404, 'user not found');

    const assignmentRoleCounts: Record<string, number> = {};
    for (const r of grouped) assignmentRoleCounts[r.role] = Number(r.count);

    return {
        ...projectUser(full),
        visibleBookCount: Number(counts?.visibleBookCount ?? 0),
        assignmentRoleCounts,
        onboardingDismissedAt: full.onboardingDismissedAt ?? '',
    };
}
