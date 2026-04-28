import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/coordinator/')({
    component: () => <div className="p-8">Coordinator panel — placeholder for F4.</div>,
});
