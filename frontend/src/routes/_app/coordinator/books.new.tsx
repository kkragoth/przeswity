import { createFileRoute } from '@tanstack/react-router';
import { canAccessCoordinator, protectedBeforeLoad } from '@/lib/auth';
import { NewBookPage } from '@/containers/coordinator/NewBookPage';

export const Route = createFileRoute('/_app/coordinator/books/new')({
    beforeLoad: protectedBeforeLoad(canAccessCoordinator),
    component: NewBookPage,
});
