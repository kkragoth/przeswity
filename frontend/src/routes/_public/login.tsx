import { createFileRoute } from '@tanstack/react-router';
import { LoginPage } from '@/containers/auth/LoginPage';

export const Route = createFileRoute('/_public/login')({
    validateSearch: (search: Record<string, unknown>) => ({
        next: typeof search.next === 'string' ? search.next : undefined,
        reason: typeof search.reason === 'string' ? search.reason : undefined,
    }),
    component: LoginPage,
});
