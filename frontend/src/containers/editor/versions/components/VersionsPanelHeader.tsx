import { useTranslation } from 'react-i18next';

interface VersionsPanelHeaderProps {
    label: string
    onLabelChange: (label: string) => void
    onCreate: () => void
}

export function VersionsPanelHeader({ label, onLabelChange, onCreate }: VersionsPanelHeaderProps) {
    const { t } = useTranslation('editor');
    return (
        <>
            <div className="sidebar-title">{t('pane.versions')}</div>
            <div className="version-create">
                <input
                    type="text"
                    placeholder={t('versions.labelPlaceholder')}
                    value={label}
                    onChange={(e) => onLabelChange(e.target.value)}
                />
                <button type="button" onClick={onCreate}>
                    {t('versions.createSnapshot')}
                </button>
            </div>
        </>
    );
}
