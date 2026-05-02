import { createFileRoute } from '@tanstack/react-router';
import type { SessionUser } from '@/auth/types';
import { canAccessCoordinator, requireRole } from '@/lib/auth';
import { CoordinatorDashboard } from '@/containers/coordinator/CoordinatorDashboard';

export const Route = createFileRoute('/_app/coordinator/')({
    beforeLoad: ({ context }) => { requireRole(context, canAccessCoordinator); },
    component: CoordinatorRoute,
});

function CoordinatorRoute() {
    const { session } = Route.useRouteContext();
    return <CoordinatorDashboard me={session.user as SessionUser} />;
}
