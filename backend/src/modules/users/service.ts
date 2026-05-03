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
    const [full] = await db.select().from(user).where(eq(user.id, userId));
    if (!full) throw new AppError('errors.user.notFound', 404, 'user not found');
    // visibleBookCount comes back from SQL; role counts still need each row, but a single
    // query keeps round-trips at one. Distinct: book_id can repeat across role rows for
    // the same book, so DISTINCT matters.
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
