import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { diffStats, type JSONNode } from '@/editor/versions/diffDoc';
import { DiffRichView } from '@/containers/editor/components/versions/DiffRichView';
import { MarkdownDiffView } from '@/containers/editor/components/versions/MarkdownDiffView';

const enum ViewMode {
    Rich = 'rich',
    Markdown = 'md',
}

const enum LayoutMode {
    Inline = 'inline',
    Sbs = 'sbs',
}

interface Props {
    diffJson: JSONNode;
    olderJson?: JSONNode;
    newerJson?: JSONNode;
    olderLabel: string;
    newerLabel: string;
    onClose: () => void;
    onRestore?: () => void;
}

export function VersionDiffModal({
    diffJson,
    olderJson,
    newerJson,
    olderLabel,
    newerLabel,
    onClose,
    onRestore,
}: Props) {
    const { t } = useTranslation('editor');
    const [view, setView] = useState<ViewMode>(ViewMode.Rich);
    const [layout, setLayout] = useState<LayoutMode>(LayoutMode.Inline);
    const stats = diffStats(diffJson);
    const sbsAvailable = !!olderJson && !!newerJson;
    const useSbs = layout === LayoutMode.Sbs && sbsAvailable;

    return (
        <div className="modal-backdrop" onMouseDown={onClose}>
            <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
                <header className="modal-header">
                    <div>
                        <div className="modal-title">{t('versions.compareTitle')}</div>
                        <div className="modal-sub">
                            <span className="version-tag version-tag-older">{olderLabel}</span>
                            <span className="modal-arrow">→</span>
                            <span className="version-tag version-tag-newer">{newerLabel}</span>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <div className="sbs-toggle">
                            <button type="button" className={view === ViewMode.Rich ? 'is-active' : ''} onClick={() => setView(ViewMode.Rich)}>
                                {t('versions.viewRich')}
                            </button>
                            <button type="button" className={view === ViewMode.Markdown ? 'is-active' : ''} onClick={() => setView(ViewMode.Markdown)}>
                                {t('versions.viewMarkdown')}
                            </button>
                        </div>
                        {sbsAvailable && (
                            <div className="sbs-toggle">
                                <button type="button" className={layout === LayoutMode.Inline ? 'is-active' : ''} onClick={() => setLayout(LayoutMode.Inline)}>
                                    {t('versions.layoutInline')}
                                </button>
                                <button type="button" className={layout === LayoutMode.Sbs ? 'is-active' : ''} onClick={() => setLayout(LayoutMode.Sbs)}>
                                    {t('versions.layoutSbs')}
                                </button>
                            </div>
                        )}
                        {onRestore && (
                            <button type="button" className="btn-primary" onClick={onRestore}>
                                {t('versions.restoreOlder')}
                            </button>
                        )}
                        <button type="button" onClick={onClose}>
                            {t('global.close')}
                        </button>
                    </div>
                </header>
                <div className="modal-legend">
                    <span className="legend-chunk">
                        <span className="legend-swatch legend-ins" /> {t('versions.legendAdded', { count: stats.ins })}
                    </span>
                    <span className="legend-chunk">
                        <span className="legend-swatch legend-del" /> {t('versions.legendRemoved', { count: stats.del })}
                    </span>
                </div>
                <div className="modal-body">
                    {view === ViewMode.Rich ? (
                        <DiffRichView
                            diffJson={diffJson}
                            olderJson={olderJson}
                            newerJson={newerJson}
                            olderLabel={olderLabel}
                            newerLabel={newerLabel}
                            useSbs={useSbs}
                        />
                    ) : (
                        <MarkdownDiffView
                            diffJson={diffJson}
                            olderJson={olderJson}
                            newerJson={newerJson}
                            olderLabel={olderLabel}
                            newerLabel={newerLabel}
                            useSbs={useSbs}
                            sbsAvailable={sbsAvailable}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
