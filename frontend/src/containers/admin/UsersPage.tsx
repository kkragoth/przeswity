import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { usersList } from '@/api/generated/services.gen';
import { EmptyState } from '@/components/feedback/EmptyState';
import { NewUserDialog } from '@/containers/admin/components/NewUserDialog';
import { UsersTable } from '@/containers/admin/components/UsersTable';

const USERS_KEY = ['users'] as const;

export function UsersPage() {
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
            {isLoading ? <p className="mt-6 text-sm text-stone-500">{tc('states.loading')}</p> : users.length === 0 ? <EmptyState title={ta('users.empty')} /> : <UsersTable users={users} onChanged={invalidate} />}
        </div>
    );
}
