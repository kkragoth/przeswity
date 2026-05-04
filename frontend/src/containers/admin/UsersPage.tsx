import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { usersListOptions } from '@/api/generated/@tanstack/react-query.gen';
import { EmptyState } from '@/components/feedback/EmptyState';
import { NewUserDialog } from '@/containers/admin/components/NewUserDialog';
import { UsersTable } from '@/containers/admin/components/UsersTable';
import { useInvalidate } from '@/hooks/api/cache/useInvalidate';
import { usersListQueryKey } from '@/api/generated/@tanstack/react-query.gen';

export function UsersPage() {
    const { t: ta } = useTranslation('admin');
    const { t: tc } = useTranslation('common');
    const invalidate = useInvalidate(usersListQueryKey);
    const { data: users = [], isLoading } = useQuery({
        ...usersListOptions(),
    });

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
