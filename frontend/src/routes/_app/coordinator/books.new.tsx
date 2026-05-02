import { createFileRoute, redirect } from '@tanstack/react-router';
import type { SessionUser } from '@/auth/types';
import { canAccessCoordinator } from '@/lib/auth';
import { NewBookPage } from '@/containers/coordinator/NewBookPage';

export const Route = createFileRoute('/_app/coordinator/books/new')({
    beforeLoad: ({ context }) => {
        const user = context.session?.user as SessionUser | undefined;
        if (!user || !canAccessCoordinator(user)) throw redirect({ to: '/' });
    },
    component: NewBookPage,
});
