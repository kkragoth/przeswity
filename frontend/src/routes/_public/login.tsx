import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

interface LoginSearch {
    next?: string;
}

export const Route = createFileRoute('/_public/login')({
    validateSearch: (search: Record<string, unknown>): LoginSearch => ({
        next: typeof search.next === 'string' ? search.next : undefined,
    }),
    component: Login,
});

function Login() {
    const { t } = useTranslation('auth');
    return (
        <div className="mx-auto max-w-md py-16">
            <h1 className="text-2xl font-semibold">{t('login.title')}</h1>
            <p className="text-stone-600 mt-2">{t('login.subtitle')}</p>
            <p className="mt-8 text-sm text-stone-500">F3 fills in the form.</p>
        </div>
    );
}
