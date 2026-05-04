import { createFileRoute } from '@tanstack/react-router';
import type { SessionUser } from '@/auth/types';
import { canAccessCoordinator, protectedBeforeLoad } from '@/lib/auth';
import { CoordinatorDashboard } from '@/containers/coordinator/CoordinatorDashboard';

export const Route = createFileRoute('/_app/coordinator/')({
    beforeLoad: protectedBeforeLoad(canAccessCoordinator),
    component: CoordinatorRoute,
});

function CoordinatorRoute() {
    const { session } = Route.useRouteContext();
    return <CoordinatorDashboard me={session.user as SessionUser} />;
}
