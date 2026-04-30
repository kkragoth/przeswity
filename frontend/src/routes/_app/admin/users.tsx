import { createFileRoute, redirect } from '@tanstack/react-router';
import type { SessionUser } from '@/auth/types';
import { UsersPage } from '@/containers/admin/UsersPage';

export const Route = createFileRoute('/_app/admin/users')({
    beforeLoad: ({ context }) => {
        const user = context.session?.user as SessionUser | undefined;
        if (user?.systemRole !== 'admin') throw redirect({ to: '/' });
    },
    component: UsersPage,
});
