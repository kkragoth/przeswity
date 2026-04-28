import { createRouter } from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';
import { queryClient } from '@/app/queryClient';
import type { Session } from '@/auth/types';

export const router = createRouter({
    routeTree,
    context: {
        queryClient,
        session: null as Session | null,
    },
    defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}
