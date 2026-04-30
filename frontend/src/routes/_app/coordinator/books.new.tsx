import { createFileRoute, redirect } from '@tanstack/react-router';
import type { SessionUser } from '@/auth/types';
import { NewBookPage } from '@/containers/coordinator/NewBookPage';

export const Route = createFileRoute('/_app/coordinator/books/new')({
    beforeLoad: ({ context }) => {
        const user = context.session?.user as SessionUser | undefined;
        if (user?.systemRole !== 'admin' && user?.systemRole !== 'project_manager') throw redirect({ to: '/' });
    },
    component: NewBookPage,
});
