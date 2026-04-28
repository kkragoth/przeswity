import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { bookGet } from '@/api/generated/services.gen';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeoplePicker } from '@/components/people/PeoplePicker';
import { AssignmentList } from '@/components/people/AssignmentList';

export const Route = createFileRoute('/_app/books/$bookId')({
    component: BookDetailPage,
});

function BookDetailPage() {
    const { bookId } = Route.useParams();
    const { t } = useTranslation('common');

    const { data: book } = useQuery({
        queryKey: ['book', bookId],
        queryFn: async () => (await bookGet({ path: { id: bookId } })).data,
    });

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6">
            <Breadcrumb />
            <Topbar title={book?.title ?? '...'} />
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <EditorPanePlaceholder />
                <SidePane bookId={bookId} />
            </div>
        </div>
    );
}

function Breadcrumb() {
    const { t } = useTranslation('common');
    return (
        <nav className="text-sm text-stone-600">
            <Link to="/books" className="hover:underline">
                {t('bookDetail.back')}
            </Link>
        </nav>
    );
}

function Topbar({ title }: { title: string }) {
    const { t } = useTranslation('common');
    return (
        <div className="flex items-center justify-between border-b pb-3">
            <h1 className="text-xl font-semibold">{title}</h1>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>
                    {t('bookDetail.exportDocx')}
                </Button>
                <Button variant="outline" size="sm" disabled>
                    {t('bookDetail.exportMarkdown')}
                </Button>
                <Button variant="outline" size="sm" disabled>
                    {t('bookDetail.snapshot')}
                </Button>
            </div>
        </div>
    );
}

function EditorPanePlaceholder() {
    const { t } = useTranslation('common');
    return (
        <div className="flex min-h-[400px] items-center justify-center rounded-md border bg-white text-sm text-stone-500">
            {t('bookDetail.editorPlaceholder')}
        </div>
    );
}

function SidePane({ bookId }: { bookId: string }) {
    const { t } = useTranslation('common');
    return (
        <Tabs defaultValue="people" className="rounded-md border bg-white p-3">
            <TabsList className="w-full">
                <TabsTrigger value="comments" className="flex-1" disabled>
                    {t('bookDetail.tabs.comments')}
                </TabsTrigger>
                <TabsTrigger value="versions" className="flex-1" disabled>
                    {t('bookDetail.tabs.versions')}
                </TabsTrigger>
                <TabsTrigger value="people" className="flex-1">
                    {t('bookDetail.tabs.people')}
                </TabsTrigger>
            </TabsList>
            <TabsContent value="people" className="space-y-3">
                <div className="flex justify-end">
                    <PeoplePicker bookId={bookId} />
                </div>
                <AssignmentList bookId={bookId} />
            </TabsContent>
        </Tabs>
    );
}
