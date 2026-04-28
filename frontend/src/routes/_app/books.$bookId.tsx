import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/books/$bookId')({
    component: () => <div className="p-8">Book detail — placeholder, expanded in commit C.</div>,
});
