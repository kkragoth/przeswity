import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/admin/')({
    component: () => <div className="p-8">Admin panel — placeholder for F4.</div>,
});
