import { memo, useEffect, useRef, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SyncStatus } from './hooks/useConnectionStatus';

interface SyncMiniProps {
    status: SyncStatus;
    onReconnect: () => void;
    lastSavedAt: number | null;
}


export const SyncMini = memo(function SyncMini({ status, onReconnect, lastSavedAt }: SyncMiniProps) {
    const { t } = useTranslation('editor');
    const [open, setOpen] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const rootRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return;
        setNow(Date.now());
        const tick = window.setInterval(() => setNow(Date.now()), 30_000);
        const onPointer = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            window.clearInterval(tick);
            document.removeEventListener('mousedown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

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

    const onClick = () => {
        if (status === SyncStatus.Offline) {
            onReconnect();
            return;
        }
        setOpen((v) => !v);
    };

    const absolute = lastSavedAt
        ? new Date(lastSavedAt).toLocaleString()
        : t('statusbar.savedNever');
    const relative = (() => {
        if (!lastSavedAt) return t('statusbar.savedNever');
        const sec = Math.floor(Math.max(0, now - lastSavedAt) / 1000);
        if (sec < 10) return t('statusbar.savedJustNow');
        if (sec < 60) return t('statusbar.savedSecondsAgo', { count: sec });
        const min = Math.floor(sec / 60);
        if (min < 60) return t('statusbar.savedMinutesAgo', { count: min });
        return t('statusbar.savedHoursAgo', { count: Math.floor(min / 60) });
    })();

    return (
        <div className="statusbar-sync-wrap" ref={rootRef}>
            <button
                type="button"
                className={`statusbar-sync statusbar-sync--${status}`}
                onClick={onClick}
                title={status === SyncStatus.Offline ? t('topbar.reconnect') : label}
                aria-label={status === SyncStatus.Offline ? t('topbar.reconnect') : label}
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                {icon}
                <span>{label}</span>
            </button>
            {open ? (
                <div className="statusbar-sync-popover" role="dialog">
                    <span className="statusbar-sync-popover-title">{t('statusbar.lastSaved')}</span>
                    <span>{relative}</span>
                    <span className="statusbar-sync-popover-time">{absolute}</span>
                </div>
            ) : null}
        </div>
    );
});
