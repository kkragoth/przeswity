import { createFileRoute } from '@tanstack/react-router';
import { canAccessCoordinator, requireRole } from '@/lib/auth';
import { NewBookPage } from '@/containers/coordinator/NewBookPage';

export const Route = createFileRoute('/_app/coordinator/books/new')({
    beforeLoad: ({ context }) => { requireRole(context, canAccessCoordinator); },
    component: NewBookPage,
});
