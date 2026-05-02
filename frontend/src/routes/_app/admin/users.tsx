import { createFileRoute, redirect } from '@tanstack/react-router';
import type { SessionUser } from '@/auth/types';
import { canAccessAdmin } from '@/lib/auth';
import { UsersPage } from '@/containers/admin/UsersPage';

export const Route = createFileRoute('/_app/admin/users')({
    beforeLoad: ({ context }) => {
        const user = context.session?.user as SessionUser | undefined;
        if (!user || !canAccessAdmin(user)) throw redirect({ to: '/' });
    },
    component: UsersPage,
});
