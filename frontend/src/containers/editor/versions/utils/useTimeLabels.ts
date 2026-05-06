import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TimeLabels } from './friendlyTime';

export function useTimeLabels(): TimeLabels {
    const { t } = useTranslation('editor');
    return useMemo<TimeLabels>(() => ({
        today: t('versionHistory.today'),
        yesterday: t('versionHistory.yesterday'),
        justNow: t('versionHistory.justNow'),
        minutesAgo: (count) => t('versionHistory.minutesAgo', { count }),
        hoursAgo: (count) => t('versionHistory.hoursAgo', { count }),
    }), [t]);
}
