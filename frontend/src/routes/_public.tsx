import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_public')({ component: PublicLayout });

function PublicLayout() {
    return (
        <div className="min-h-dvh bg-stone-100">
            <Outlet />
        </div>
    );
}
