import { Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNewBookForm } from '@/hooks/api/useNewBookForm';

export function NewBookPage() {
    const { t } = useTranslation('coordinator');
    const { t: tc } = useTranslation('common');
    const navigate = useNavigate();
    const form = useNewBookForm();
    const canSubmit = form.values.title.trim().length > 0 && !form.isSubmitting;

    const submit = async () => {
        const res = await form.submit();
        const created = res.data;
        if (created) await navigate({ to: '/books/$bookId', params: { bookId: created.id } });
    };

    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-semibold">{t('newBook')}</h1>
                <Link to="/coordinator"><Button variant="outline">{tc('labels.back')}</Button></Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    <div><Label htmlFor="bookTitle">{t('newBookForm.titleField')}</Label><Input id="bookTitle" value={form.values.title} onChange={(e) => form.setField.setTitle(e.target.value)} /></div>
                    <div>
                        <Label htmlFor="bookDescription">{t('newBookForm.descriptionField')}</Label>
                        <textarea id="bookDescription" className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" rows={3} value={form.values.description} onChange={(e) => form.setField.setDescription(e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="bookMarkdown">{t('newBookForm.initialMarkdown')}</Label>
                        <textarea id="bookMarkdown" className="mt-1 w-full rounded-md border bg-transparent px-3 py-2 font-mono text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" rows={16} value={form.values.initialMarkdown} onChange={(e) => form.setField.setInitialMarkdown(e.target.value)} />
                        <p className="mt-1 text-xs text-stone-500">{t('newBookForm.pasteHint')}</p>
                    </div>
                    <Button onClick={() => void submit()} disabled={!canSubmit}>{form.isSubmitting ? tc('states.saving') : tc('actions.create')}</Button>
                </div>
                <div className="rounded-md border bg-white p-4 text-sm text-stone-500">{t('newBookForm.preview')}</div>
            </div>
        </div>
    );
}
