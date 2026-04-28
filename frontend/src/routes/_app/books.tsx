import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/books')({
    component: () => <div className="p-8">Books list — placeholder for F4.</div>,
});
