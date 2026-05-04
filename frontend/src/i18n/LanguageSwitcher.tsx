import { useTranslation } from 'react-i18next';
import { SUPPORTED } from './index';

export function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const change = (lng: string) => {
        void i18n.changeLanguage(lng);
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
