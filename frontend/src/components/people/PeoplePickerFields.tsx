import { useTranslation } from 'react-i18next';
import type { BulkCreateAssignmentsBody, User } from '@/api/generated/types.gen';
import { Role, ALL_ROLES, RoleBadge } from '@/components/badges/RoleBadge';
import { roleI18nKey } from '@/lib/roleI18n';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
type Draft = BulkCreateAssignmentsBody['assignments'][number];

export function UserSelect({
    users,
    value,
    onChange,
}: {
    users: ReadonlyArray<User>;
    value: string;
    onChange: (v: string) => void;
}) {
    const { t } = useTranslation('common');
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger>
                <SelectValue placeholder={t('people.selectUser')} />
            </SelectTrigger>
            <SelectContent>
                {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                        {u.name} <span className="text-stone-400">({u.email})</span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export function RoleSelect({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
    const { t } = useTranslation('common');
    const { t: te } = useTranslation('editor');
    return (
        <Select value={value} onValueChange={(v) => onChange(v as Role)}>
            <SelectTrigger className="w-40">
                <SelectValue placeholder={t('people.selectRole')} />
            </SelectTrigger>
            <SelectContent>
                {ALL_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                        {te(roleI18nKey(r))}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export function DraftList({
    users,
    drafts,
    onRemove,
}: {
    users: ReadonlyArray<User>;
    drafts: ReadonlyArray<Draft>;
    onRemove: (userId: string, role: Role) => void;
}) {
    const { t } = useTranslation('common');
    const userById = new Map(users.map((u) => [u.id, u]));
    if (drafts.length === 0) return <p className="text-sm text-stone-500">{t('people.noAssignments')}</p>;
    return (
        <ul className="space-y-1">
            {drafts.map((d) => {
                const u = userById.get(d.userId);
                return (
                    <li key={`${d.userId}:${d.role}`} className="flex items-center justify-between rounded border bg-white px-3 py-2 text-sm">
                        <span>
                            <span className="font-medium">{u?.name ?? d.userId}</span> <RoleBadge role={d.role} />
                        </span>
                        <Button size="sm" variant="ghost" onClick={() => onRemove(d.userId, d.role as Role)}>
                            {t('people.removeAssignment')}
                        </Button>
                    </li>
                );
            })}
        </ul>
    );
}
