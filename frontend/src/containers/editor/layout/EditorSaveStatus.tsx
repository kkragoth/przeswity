import { useTranslation } from 'react-i18next';
import { usePaneStore } from '@/containers/editor/session/paneStore';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useDirtySaveIndicator, SaveStatus } from '@/containers/editor/versions/hooks/useDirtySaveIndicator';
import { useSession } from '@/containers/editor/SessionStoreProvider';
import { LeftTab } from '@/containers/editor/layout/LeftPane';

export function EditorSaveStatus() {
    const { t } = useTranslation('editor');
    const { collab } = useEditorSession();
    const setLeftTab = useSession((s) => s.setLeftTab);
    const expandPane = usePaneStore((s) => s.expand);

    const status = useDirtySaveIndicator(collab.doc, collab.provider);

    const openVersionHistory = () => {
        setLeftTab(LeftTab.Versions);
        expandPane('left');
    };

    const label = statusLabel(status, t);
    if (!label) return null;

    return (
        <button
            type="button"
            className={`save-status save-status--${status}`}
            onClick={openVersionHistory}
            title={t('pane.versions')}
        >
            {label}
        </button>
    );
}

type TFn = ReturnType<typeof useTranslation<'editor'>>['t'];

function statusLabel(status: SaveStatus, t: TFn): string | null {
    switch (status) {
        case SaveStatus.Saving: return t('topbar.syncing');
        case SaveStatus.Saved: return t('topbar.synced');
        case SaveStatus.Offline: return t('topbar.offlineLocal');
        case SaveStatus.Error: return t('topbar.offlineLocal');
        case SaveStatus.Idle: return null;
    }
}
