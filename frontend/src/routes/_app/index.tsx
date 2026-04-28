import { createFileRoute, redirect } from '@tanstack/react-router';
import type { SessionUser } from '@/auth/types';

export const Route = createFileRoute('/_app/')({
    beforeLoad({ context }) {
        const user = context.session?.user as SessionUser | undefined;
        if (user?.isAdmin) throw redirect({ to: '/admin' });
        if (user?.isCoordinator) throw redirect({ to: '/coordinator' });
        throw redirect({ to: '/books' });
    },
});
