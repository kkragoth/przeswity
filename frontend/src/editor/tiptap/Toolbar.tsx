import type { Editor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { PanelLeft, PanelRight } from 'lucide-react';

import { StyleDropdown } from './StyleDropdown';
import { PaneState, usePaneStore } from '@/containers/editor/stores/paneStore';
import { TextFormattingZone } from '@/editor/tiptap/toolbar/TextFormattingZone';
import { BlockFormattingZone } from '@/editor/tiptap/toolbar/BlockFormattingZone';
import { InsertZone } from '@/editor/tiptap/toolbar/InsertZone';
import { PaneToggleZone, Divider } from '@/editor/tiptap/toolbar/PaneToggleZone';
import { useEditorLive } from '@/containers/editor/EditorLiveProvider';

export interface ToolbarProps {
    editor: Editor;
    leftPaneTab: string;
    rightPaneTab: string;
    onToggleLeftPane: () => void;
    onToggleRightPane: () => void;
}

export function Toolbar({
    editor,
    leftPaneTab,
    rightPaneTab,
    onToggleLeftPane,
    onToggleRightPane,
}: ToolbarProps) {
    const { t } = useTranslation('editor');
    const leftExpanded = usePaneStore((s) => s.left === PaneState.Expanded);
    const rightExpanded = usePaneStore((s) => s.right === PaneState.Expanded);
    // Narrow selector — only this hook re-renders when suggesting toggles.
    const suggestingMode = useEditorLive((s) => s.suggesting.effective);

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
