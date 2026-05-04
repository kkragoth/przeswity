import { createFileRoute } from '@tanstack/react-router';
import { canAccessAdmin, protectedBeforeLoad } from '@/lib/auth';
import { UsersPage } from '@/containers/admin/UsersPage';

export const Route = createFileRoute('/_app/admin/users')({
    beforeLoad: protectedBeforeLoad(canAccessAdmin),
    component: UsersPage,
});
