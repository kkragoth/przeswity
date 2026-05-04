import { memo } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SyncStatus } from './hooks/useConnectionStatus';

interface SyncMiniProps {
    status: SyncStatus;
    onReconnect: () => void;
}

export const SyncMini = memo(function SyncMini({ status, onReconnect }: SyncMiniProps) {
    const { t } = useTranslation('editor');
    const label = status === SyncStatus.Online
        ? t('topbar.synced')
        : status === SyncStatus.Connecting
            ? t('topbar.syncing')
            : t('topbar.offlineLocal');

    const icon = status === SyncStatus.Online
        ? <Cloud size={11} />
        : status === SyncStatus.Connecting
            ? <RefreshCw size={11} className="statusbar-sync-spin" />
            : <CloudOff size={11} />;

    return (
        <button
            type="button"
            className={`statusbar-sync statusbar-sync--${status}`}
            onClick={status === SyncStatus.Offline ? onReconnect : undefined}
            disabled={status !== SyncStatus.Offline}
            title={status === SyncStatus.Offline ? t('topbar.reconnect') : label}
            aria-label={status === SyncStatus.Offline ? t('topbar.reconnect') : label}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
});
