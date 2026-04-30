import type { User } from '@/api/generated/types.gen';
import { DeleteUserButton } from '@/containers/admin/components/DeleteUserButton';
import { EditUserDialog } from '@/containers/admin/components/EditUserDialog';
import { SystemRoleBadge } from '@/containers/admin/components/SystemRoleBadge';

export function UserRow({ user, onChanged }: { user: User; onChanged: () => void }) {
    return (
        <tr className="border-b">
            <td className="py-2"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: user.color }} />{user.name}</td>
            <td className="text-stone-600">{user.email}</td>
            <td className="space-x-1"><SystemRoleBadge systemRole={user.systemRole} /></td>
            <td className="text-stone-600">{user.competencyTags.join(', ')}</td>
            <td className="space-x-2">
                <EditUserDialog user={user} onSaved={onChanged} />
                <DeleteUserButton id={user.id} onDeleted={onChanged} />
            </td>
        </tr>
    );
}
