import { createFileRoute, redirect } from '@tanstack/react-router';
import type { SessionUser } from '@/auth/types';
import { CoordinatorDashboard } from '@/containers/coordinator/CoordinatorDashboard';

export const Route = createFileRoute('/_app/coordinator/')({
    beforeLoad: ({ context }) => {
        const user = context.session?.user as SessionUser | undefined;
        if (user?.systemRole !== 'admin' && user?.systemRole !== 'project_manager') throw redirect({ to: '/' });
    },
    component: CoordinatorRoute,
});

function CoordinatorRoute() {
    const { session } = Route.useRouteContext();
    return <CoordinatorDashboard me={session.user as SessionUser} />;
}
