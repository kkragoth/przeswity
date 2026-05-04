import type { User, UpdateUserBody } from '@/api/generated/types.gen';
import { SystemRole } from '@/auth/types';

export interface UserFormState {
    name: string;
    email: string;
    password: string;
    systemRole: SystemRole | null;
    color: string;
    competencyTagsRaw: string;
}

export const tagsToString = (tags: ReadonlyArray<string>) => tags.join(', ');
export const stringToTags = (s: string) => s.split(',').map((t) => t.trim()).filter((t) => t.length > 0);

export function emptyForm(): UserFormState {
    return { name: '', email: '', password: '', systemRole: null, color: '#888888', competencyTagsRaw: '' };
}

export function fromUser(user: User): UserFormState {
    return {
        name: user.name,
        email: user.email,
        password: '',
        systemRole: (user.systemRole as SystemRole | null) ?? null,
        color: user.color,
        competencyTagsRaw: tagsToString(user.competencyTags),
    };
}

export function toUpdateUserBody(form: UserFormState): UpdateUserBody {
    return {
        name: form.name,
        systemRole: form.systemRole,
        color: form.color,
        competencyTags: stringToTags(form.competencyTagsRaw),
    };
}
