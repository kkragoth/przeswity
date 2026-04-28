import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/globals.css';
import './i18n';
import '@/api/client';

import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './i18n/LanguageSwitcher';

function App() {
    const { t } = useTranslation('common');
    return (
        <div className="min-h-dvh flex items-center justify-center">
            <div className="rounded-lg border bg-white shadow-sm p-8 space-y-4">
                <h1 className="text-2xl font-semibold">{t('appName')}</h1>
                <p className="text-stone-600">{t('states.loading')}</p>
                <LanguageSwitcher />
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
