import type { Editor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { PanelLeft, PanelRight } from 'lucide-react';

import { StyleDropdown } from './StyleDropdown';
import { PaneState, usePaneStore } from '@/containers/editor/session/paneStore';
import { TextFormattingZone } from '@/editor/tiptap/toolbar/TextFormattingZone';
import { BlockFormattingZone } from '@/editor/tiptap/toolbar/BlockFormattingZone';
import { InsertZone } from '@/editor/tiptap/toolbar/InsertZone';
import { PaneToggleZone, Divider } from '@/editor/tiptap/toolbar/PaneToggleZone';
import { ZoomControl } from '@/editor/tiptap/toolbar/ZoomControl';
import { useEditorLive } from '@/containers/editor/session/LiveProvider';
import { useSession } from '@/containers/editor/SessionStoreProvider';
import { LeftTab } from '@/containers/editor/layout/LeftPane';
import { RightTab } from '@/containers/editor/layout/RightPane';
import { useNarrowLayout } from '@/containers/editor/hooks/useNarrowLayout';

export interface ToolbarProps {
    editor: Editor;
}

export function Toolbar({ editor }: ToolbarProps) {
    const { t } = useTranslation('editor');
    const leftTab = useSession((s) => s.leftTab);
    const rightTab = useSession((s) => s.rightTab);
    const togglePane = usePaneStore((s) => s.toggle);
    const leftExpanded = usePaneStore((s) => s.left === PaneState.Expanded);
    const rightExpanded = usePaneStore((s) => s.right === PaneState.Expanded);
    const narrow = useNarrowLayout();
    const suggestingMode = useEditorLive((s) => s.suggesting.effective);

    const leftTabLabels: Record<LeftTab, string> = {
        [LeftTab.Outline]: t('pane.outline'),
        [LeftTab.Versions]: t('pane.versions'),
        [LeftTab.Glossary]: t('pane.glossary'),
        [LeftTab.Meta]: t('pane.meta'),
        [LeftTab.Files]: t('pane.files'),
    };
    const rightTabLabels: Record<RightTab, string> = {
        [RightTab.Comments]: t('pane.comments'),
        [RightTab.Suggestions]: t('pane.suggestions'),
    };
    const leftPaneTab = leftTabLabels[leftTab];
    const rightPaneTab = rightTabLabels[rightTab];
    const onToggleLeftPane = () => togglePane('left', narrow);
    const onToggleRightPane = () => togglePane('right', narrow);

    return (
        <TooltipPrimitive.Provider delayDuration={400}>
            <div className={`toolbar${suggestingMode ? ' is-suggesting' : ''}`} role="toolbar" aria-label={t('toolbar.ariaLabel')}>
                <button
                    type="button"
                    className={`tb-pane-btn tb-pane-btn--left${leftExpanded ? ' is-active' : ''}`}
                    onClick={onToggleLeftPane}
                    aria-pressed={leftExpanded}
                    aria-label={t('topbar.toggleLeftPane')}
                >
                    <PanelLeft size={14} />
                    <span>{leftPaneTab}</span>
                </button>

                <StyleDropdown editor={editor} />
                <Divider />
                <TextFormattingZone editor={editor} />
                <Divider />
                <BlockFormattingZone editor={editor} />
                <Divider />
                <InsertZone editor={editor} />

                <div className="tb-spacer" />
                <ZoomControl />
                <Divider />
                <PaneToggleZone />
                <button
                    type="button"
                    className={`tb-pane-btn tb-pane-btn--right${rightExpanded ? ' is-active' : ''}`}
                    onClick={onToggleRightPane}
                    aria-pressed={rightExpanded}
                    aria-label={t('topbar.toggleRightPane')}
                >
                    <span>{rightPaneTab}</span>
                    <PanelRight size={14} />
                </button>
            </div>
        </TooltipPrimitive.Provider>
    );
}
