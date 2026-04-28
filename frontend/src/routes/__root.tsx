import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import type { Session } from '@/auth/types';

interface RouterContext {
    queryClient: QueryClient;
    session: Session | null;
}

export const Route = createRootRouteWithContext<RouterContext>()({
    component: RootLayout,
});

function RootLayout() {
    const { queryClient } = Route.useRouteContext();
    return (
        <QueryClientProvider client={queryClient}>
            <Outlet />
            <Toaster position="top-right" />
        </QueryClientProvider>
    );
}
