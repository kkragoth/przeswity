import { useTranslation } from 'react-i18next';
import { EditorHost } from '@/containers/editor/EditorHost';
import { useBookContext } from '@/hooks/api/useBookContext';

export function BookEditorPage({ bookId }: { bookId: string }) {
    const { t } = useTranslation('common');
    const ctx = useBookContext(bookId);

    if (!ctx.me) return null;
    if (ctx.isLoading) return <div className="p-8 text-sm text-stone-500">{t('states.loading')}</div>;
    if (!ctx.book) return <div className="p-8 text-sm text-stone-500">{t('bookDetail.notFound')}</div>;

    const role = ctx.primaryRole ?? 'editor';
    const me = ctx.me as { id: string; email: string; name?: string | null; color?: string };
    return (
        <EditorHost
            bookId={bookId}
            user={{ id: me.id, name: me.name ?? me.email, color: me.color ?? '#7c3aed', role }}
            bookTitle={ctx.book.title}
        />
    );
}
