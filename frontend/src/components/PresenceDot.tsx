import { useTranslation } from 'react-i18next';

export function PresenceDot({ online }: { online: boolean }) {
    const { t } = useTranslation('common');
    return (
        <span
            className={`inline-block h-2 w-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-stone-300'}`}
            aria-label={online ? t('states.online') : t('states.offline')}
        />
    );
}
