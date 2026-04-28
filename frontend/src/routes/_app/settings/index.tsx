import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/settings/')({
    component: () => <div className="p-8">Settings — placeholder for F4.</div>,
});
