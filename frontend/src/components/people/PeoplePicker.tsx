import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { bookAssignmentsBulkCreate, usersList } from '@/api/generated/services.gen';
import type { BulkCreateAssignmentsBody, User } from '@/api/generated/types.gen';
import { ROLE_KEYS, RoleBadge } from '@/components/RoleBadge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type Role = (typeof ROLE_KEYS)[number];
type Draft = BulkCreateAssignmentsBody['assignments'][number];

const dedupe = (drafts: ReadonlyArray<Draft>): ReadonlyArray<Draft> => {
    const seen = new Set<string>();
    return drafts.filter((d) => {
        const key = `${d.userId}:${d.role}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

export function PeoplePicker({ bookId }: { bookId: string }) {
    const { t } = useTranslation('common');
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [drafts, setDrafts] = useState<ReadonlyArray<Draft>>([]);
    const [filter, setFilter] = useState('');
    const [pickedUserId, setPickedUserId] = useState<string>('');
    const [pickedRole, setPickedRole] = useState<Role>('editor');

    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: async () => (await usersList()).data ?? [],
    });

    const filtered = users.filter((u) => userMatches(u, filter));

    const m = useMutation({
        mutationFn: () =>
            bookAssignmentsBulkCreate({
                path: { bookId },
                body: { assignments: drafts as Draft[] },
            }),
        onSuccess: () => {
            setOpen(false);
            setDrafts([]);
            void qc.invalidateQueries({ queryKey: ['bookAssignments', bookId] });
        },
    });

    const addDraft = () => {
        if (!pickedUserId) return;
        setDrafts((prev) => dedupe([...prev, { userId: pickedUserId, role: pickedRole }]));
    };

    const removeDraft = (userId: string, role: Role) =>
        setDrafts((prev) => prev.filter((d) => !(d.userId === userId && d.role === role)));

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                setOpen(o);
                if (!o) setDrafts([]);
            }}
        >
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    {t('people.addPeople')}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>{t('people.addPeople')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <Input
                        placeholder={t('labels.search')}
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                    <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                        <UserSelect
                            users={filtered}
                            value={pickedUserId}
                            onChange={setPickedUserId}
                        />
                        <RoleSelect value={pickedRole} onChange={setPickedRole} />
                        <Button onClick={addDraft} disabled={!pickedUserId}>
                            {t('people.addAssignment')}
                        </Button>
                    </div>
                    <DraftList users={users} drafts={drafts} onRemove={removeDraft} />
                </div>
                <DialogFooter>
                    <Button onClick={() => m.mutate()} disabled={drafts.length === 0 || m.isPending}>
                        {m.isPending ? t('states.saving') : t('people.submit')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function userMatches(u: User, query: string) {
    if (!query) return true;
    const q = query.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
}

function UserSelect({
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

function RoleSelect({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
    const { t } = useTranslation('common');
    return (
        <Select value={value} onValueChange={(v) => onChange(v as Role)}>
            <SelectTrigger className="w-40">
                <SelectValue placeholder={t('people.selectRole')} />
            </SelectTrigger>
            <SelectContent>
                {ROLE_KEYS.map((r) => (
                    <SelectItem key={r} value={r}>
                        {r}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function DraftList({
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
    if (drafts.length === 0) {
        return <p className="text-sm text-stone-500">{t('people.noAssignments')}</p>;
    }
    return (
        <ul className="space-y-1">
            {drafts.map((d) => {
                const u = userById.get(d.userId);
                return (
                    <li
                        key={`${d.userId}:${d.role}`}
                        className="flex items-center justify-between rounded border bg-white px-3 py-2 text-sm"
                    >
                        <span>
                            <span className="font-medium">{u?.name ?? d.userId}</span>{' '}
                            <RoleBadge role={d.role} />
                        </span>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onRemove(d.userId, d.role as Role)}
                        >
                            {t('people.removeAssignment')}
                        </Button>
                    </li>
                );
            })}
        </ul>
    );
}
