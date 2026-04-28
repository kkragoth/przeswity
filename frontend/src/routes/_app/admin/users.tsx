import { createFileRoute, redirect } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SessionUser } from '@/auth/types';
import { userCreate, userDelete, userPatch, usersList } from '@/api/generated/services.gen';
import type { User, UpdateUserBody } from '@/api/generated/types.gen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';

const USERS_KEY = ['users'] as const;

type SystemRole = 'admin' | 'project_manager' | null;

export const Route = createFileRoute('/_app/admin/users')({
    beforeLoad: ({ context }) => {
        const user = context.session?.user as SessionUser | undefined;
        if (user?.systemRole !== 'admin') throw redirect({ to: '/' });
    },
    component: AdminUsersPage,
});

const tagsToString = (tags: ReadonlyArray<string>) => tags.join(', ');
const stringToTags = (s: string) =>
    s.split(',').map((t) => t.trim()).filter((t) => t.length > 0);

function AdminUsersPage() {
    const { t: ta } = useTranslation('admin');
    const { t: tc } = useTranslation('common');
    const qc = useQueryClient();
    const { data: users = [], isLoading } = useQuery({
        queryKey: USERS_KEY,
        queryFn: async () => (await usersList()).data ?? [],
    });

    const invalidate = () => qc.invalidateQueries({ queryKey: USERS_KEY });

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">{ta('users.title')}</h1>
                <NewUserDialog onCreated={invalidate} />
            </div>
            {isLoading ? (
                <p className="mt-6 text-sm text-stone-500">{tc('states.loading')}</p>
            ) : users.length === 0 ? (
                <EmptyState title={ta('users.empty')} />
            ) : (
                <UsersTable users={users} onChanged={invalidate} />
            )}
        </div>
    );
}

function systemRoleBadge(systemRole: string | null | undefined) {
    if (systemRole === 'admin') return <Badge>Admin</Badge>;
    if (systemRole === 'project_manager') return <Badge variant="secondary">Project Manager</Badge>;
    return null;
}

function UsersTable({ users, onChanged }: { users: ReadonlyArray<User>; onChanged: () => void }) {
    const { t: ta } = useTranslation('admin');
    return (
        <table className="mt-6 w-full text-sm">
            <thead className="border-b text-left text-stone-600">
                <tr>
                    <th className="py-2 font-medium">{ta('users.table.name')}</th>
                    <th className="font-medium">{ta('users.table.email')}</th>
                    <th className="font-medium">{ta('users.table.badges')}</th>
                    <th className="font-medium">{ta('users.table.competencyTags')}</th>
                    <th className="font-medium">{ta('users.table.actions')}</th>
                </tr>
            </thead>
            <tbody>
                {users.map((u) => (
                    <UserRow key={u.id} user={u} onChanged={onChanged} />
                ))}
            </tbody>
        </table>
    );
}

function UserRow({ user, onChanged }: { user: User; onChanged: () => void }) {
    const { t: tc } = useTranslation('common');
    return (
        <tr className="border-b">
            <td className="py-2">
                <span
                    className="mr-2 inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: user.color }}
                />
                {user.name}
            </td>
            <td className="text-stone-600">{user.email}</td>
            <td className="space-x-1">{systemRoleBadge(user.systemRole)}</td>
            <td className="text-stone-600">{user.competencyTags.join(', ')}</td>
            <td className="space-x-2">
                <EditUserDialog user={user} onSaved={onChanged} />
                <DeleteUserButton id={user.id} onDeleted={onChanged} />
            </td>
        </tr>
    );
}

interface UserFormState {
    name: string;
    email: string;
    password: string;
    systemRole: SystemRole;
    color: string;
    competencyTagsRaw: string;
}

function emptyForm(): UserFormState {
    return {
        name: '',
        email: '',
        password: '',
        systemRole: null,
        color: '#888888',
        competencyTagsRaw: '',
    };
}

function fromUser(user: User): UserFormState {
    return {
        name: user.name,
        email: user.email,
        password: '',
        systemRole: (user.systemRole as SystemRole) ?? null,
        color: user.color,
        competencyTagsRaw: tagsToString(user.competencyTags),
    };
}

function NewUserDialog({ onCreated }: { onCreated: () => void }) {
    const { t: ta } = useTranslation('admin');
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<UserFormState>(emptyForm);
    const m = useMutation({
        mutationFn: () =>
            userCreate({
                body: {
                    email: form.email,
                    name: form.name,
                    password: form.password,
                    systemRole: form.systemRole,
                    competencyTags: stringToTags(form.competencyTagsRaw),
                },
            }),
        onSuccess: () => {
            setOpen(false);
            setForm(emptyForm());
            onCreated();
        },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>{ta('users.newUserCta')}</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{ta('users.form.createTitle')}</DialogTitle>
                </DialogHeader>
                <UserFormFields form={form} onChange={setForm} includePassword />
                <DialogFooter>
                    <SubmitButton pending={m.isPending} onClick={() => m.mutate()} />
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function EditUserDialog({ user, onSaved }: { user: User; onSaved: () => void }) {
    const { t: ta } = useTranslation('admin');
    const { t: tc } = useTranslation('common');
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<UserFormState>(() => fromUser(user));
    const m = useMutation({
        mutationFn: () => {
            const body: UpdateUserBody = {
                name: form.name,
                systemRole: form.systemRole,
                color: form.color,
                competencyTags: stringToTags(form.competencyTagsRaw),
            };
            return userPatch({ path: { id: user.id }, body });
        },
        onSuccess: () => {
            setOpen(false);
            onSaved();
        },
    });

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                setOpen(o);
                if (o) setForm(fromUser(user));
            }}
        >
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    {tc('actions.edit')}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{ta('users.form.editTitle')}</DialogTitle>
                </DialogHeader>
                <UserFormFields form={form} onChange={setForm} />
                <DialogFooter>
                    <Button onClick={() => m.mutate()} disabled={m.isPending}>
                        {m.isPending ? tc('states.saving') : tc('actions.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function UserFormFields({
    form,
    onChange,
    includePassword,
}: {
    form: UserFormState;
    onChange: (next: UserFormState) => void;
    includePassword?: boolean;
}) {
    const { t: ta } = useTranslation('admin');
    const { t: tc } = useTranslation('common');
    const set = <K extends keyof UserFormState>(k: K, v: UserFormState[K]) =>
        onChange({ ...form, [k]: v });
    return (
        <div className="space-y-3">
            <div>
                <Label>{tc('labels.email')}</Label>
                <Input
                    value={form.email}
                    disabled={!includePassword}
                    onChange={(e) => set('email', e.target.value)}
                />
            </div>
            <div>
                <Label>{tc('labels.name')}</Label>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            {includePassword && (
                <div>
                    <Label>{tc('labels.password')}</Label>
                    <Input
                        type="password"
                        value={form.password}
                        onChange={(e) => set('password', e.target.value)}
                    />
                </div>
            )}
            <div>
                <Label>{tc('labels.color')}</Label>
                <Input
                    type="color"
                    value={form.color}
                    onChange={(e) => set('color', e.target.value)}
                />
            </div>
            <div>
                <Label>{ta('users.form.competencyTags')}</Label>
                <Input
                    value={form.competencyTagsRaw}
                    placeholder={ta('users.form.competencyTagsHint')}
                    onChange={(e) => set('competencyTagsRaw', e.target.value)}
                />
            </div>
            <div>
                <Label>{ta('users.form.systemRole')}</Label>
                <select
                    className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm"
                    value={form.systemRole ?? ''}
                    onChange={(e) => set('systemRole', (e.target.value || null) as SystemRole)}
                >
                    <option value="">{ta('users.form.systemRoleNone')}</option>
                    <option value="project_manager">{ta('users.form.systemRoleProjectManager')}</option>
                    <option value="admin">{ta('users.form.systemRoleAdmin')}</option>
                </select>
            </div>
        </div>
    );
}

function SubmitButton({ pending, onClick }: { pending: boolean; onClick: () => void }) {
    const { t: tc } = useTranslation('common');
    return (
        <Button onClick={onClick} disabled={pending}>
            {pending ? tc('states.saving') : tc('actions.create')}
        </Button>
    );
}

function DeleteUserButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
    const { t: ta } = useTranslation('admin');
    const { t: tc } = useTranslation('common');
    const [open, setOpen] = useState(false);
    const m = useMutation({
        mutationFn: () => userDelete({ path: { id } }),
        onSuccess: () => {
            setOpen(false);
            onDeleted();
        },
    });
    return (
        <ConfirmDialog
            open={open}
            onOpenChange={setOpen}
            trigger={
                <Button size="sm" variant="destructive">
                    {tc('actions.delete')}
                </Button>
            }
            title={ta('users.deleteConfirm')}
            destructive
            confirmLabel={tc('actions.delete')}
            onConfirm={() => m.mutate()}
        />
    );
}
