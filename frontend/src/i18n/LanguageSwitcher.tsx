import { useTranslation } from 'react-i18next';
import { SUPPORTED } from './index';

export function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const change = (lng: string) => {
        void i18n.changeLanguage(lng);
        try { localStorage.setItem('przeswity.lang', lng); } catch {}
        // PATCH /api/me — wired in F4j; silent fail if endpoint not yet there.
    };
    return (
        <select
            className="rounded border bg-background px-2 py-1 text-sm"
            value={i18n.resolvedLanguage ?? 'pl'}
            onChange={(e) => change(e.target.value)}
            aria-label="Language"
        >
            {SUPPORTED.map((l) => (
                <option key={l} value={l}>
                    {l === 'pl' ? 'Polski' : l === 'en' ? 'English' : 'Українська'}
                </option>
            ))}
        </select>
    );
}
