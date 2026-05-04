import { Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Tip } from '@/editor/tiptap/toolbar/Primitives';
import { useEditorZoom } from '@/contexts/EditorZoomContext';

export function ZoomControl() {
    const { t } = useTranslation('editor');
    const { zoom, zoomIn, zoomOut, resetZoom, canZoomIn, canZoomOut } = useEditorZoom();
    const percent = Math.round(zoom * 100);

    return (
        <div className="tb-zoom" role="group" aria-label={t('toolbar.zoom.label')}>
            <Tip label={t('toolbar.zoom.out')} shortcut="⌘-">
                <button
                    type="button"
                    className="tb-btn"
                    onClick={zoomOut}
                    disabled={!canZoomOut}
                    aria-label={t('toolbar.zoom.out')}
                >
                    <Minus size={14} />
                </button>
            </Tip>
            <Tip label={t('toolbar.zoom.reset')} shortcut="⌘0">
                <button
                    type="button"
                    className="tb-zoom-percent"
                    onClick={resetZoom}
                    aria-label={t('toolbar.zoom.reset')}
                >
                    {percent}%
                </button>
            </Tip>
            <Tip label={t('toolbar.zoom.in')} shortcut="⌘+">
                <button
                    type="button"
                    className="tb-btn"
                    onClick={zoomIn}
                    disabled={!canZoomIn}
                    aria-label={t('toolbar.zoom.in')}
                >
                    <Plus size={14} />
                </button>
            </Tip>
        </div>
    );
}
