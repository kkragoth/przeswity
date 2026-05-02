import { createFileRoute } from '@tanstack/react-router';
import { canAccessAdmin, requireRole } from '@/lib/auth';
import { UsersPage } from '@/containers/admin/UsersPage';

export const Route = createFileRoute('/_app/admin/users')({
    beforeLoad: ({ context }) => { requireRole(context, canAccessAdmin); },
    component: UsersPage,
});
