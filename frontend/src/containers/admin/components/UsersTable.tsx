import { useTranslation } from 'react-i18next';
import type { User } from '@/api/generated/types.gen';
import { UserRow } from '@/containers/admin/components/UserRow';

export function UsersTable({ users }: { users: ReadonlyArray<User> }) {
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
            <tbody>{users.map((user) => <UserRow key={user.id} user={user} />)}</tbody>
        </table>
    );
}
