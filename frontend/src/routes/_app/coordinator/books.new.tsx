import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SessionUser } from '@/auth/types';
import { bookCreate } from '@/api/generated/services.gen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const Route = createFileRoute('/_app/coordinator/books/new')({
    beforeLoad: ({ context }) => {
        const user = context.session?.user as SessionUser | undefined;
        if (!user?.isAdmin && !user?.isCoordinator) throw redirect({ to: '/' });
    },
    component: NewBookPage,
});

function NewBookPage() {
    const { t } = useTranslation('coordinator');
    const { t: tc } = useTranslation('common');
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [initialMarkdown, setInitialMarkdown] = useState('');

    const m = useMutation({
        mutationFn: () =>
            // TODO: PeoplePicker for initialAssignments — see book detail page
            bookCreate({ body: { title, description, initialMarkdown, initialAssignments: [] } }),
        onSuccess: (res) => {
            const created = res.data;
            if (created) void navigate({ to: '/books/$bookId', params: { bookId: created.id } });
        },
    });

    const canSubmit = title.trim().length > 0 && !m.isPending;

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-semibold">{t('newBook')}</h1>
                <Link to="/coordinator">
                    <Button variant="outline">{tc('labels.back')}</Button>
                </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="bookTitle">{t('newBookForm.titleField')}</Label>
                        <Input id="bookTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="bookDescription">{t('newBookForm.descriptionField')}</Label>
                        <textarea
                            id="bookDescription"
                            className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="bookMarkdown">{t('newBookForm.initialMarkdown')}</Label>
                        <textarea
                            id="bookMarkdown"
                            className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 font-mono text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            rows={16}
                            value={initialMarkdown}
                            onChange={(e) => setInitialMarkdown(e.target.value)}
                        />
                        <p className="mt-1 text-xs text-stone-500">{t('newBookForm.pasteHint')}</p>
                    </div>
                    <Button onClick={() => m.mutate()} disabled={!canSubmit}>
                        {m.isPending ? tc('states.saving') : tc('actions.create')}
                    </Button>
                </div>
                <div className="rounded-md border bg-white p-4 text-sm text-stone-500">
                    {t('newBookForm.preview')}
                </div>
            </div>
        </div>
    );
}
