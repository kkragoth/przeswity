import type { Editor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { PanelLeft, PanelRight } from 'lucide-react';

import { StyleDropdown } from './StyleDropdown';
import type { User } from '@/editor/identity/types';
import { PaneState } from '@/containers/editor/hooks/usePaneState';
import { TextFormattingZone } from '@/editor/tiptap/toolbar/TextFormattingZone';
import { BlockFormattingZone } from '@/editor/tiptap/toolbar/BlockFormattingZone';
import { InsertZone } from '@/editor/tiptap/toolbar/InsertZone';
import { PaneToggleZone, Divider } from '@/editor/tiptap/toolbar/PaneToggleZone';

export interface ToolbarProps {
    editor: Editor;
    user: User;
    suggestingMode: boolean;
    suggestingForced: boolean;
    onSuggestingModeChange: (mode: boolean) => void;
    leftPaneState: PaneState;
    rightPaneState: PaneState;
    leftPaneTab: string;
    rightPaneTab: string;
    onToggleLeftPane: () => void;
    onToggleRightPane: () => void;
}

export function Toolbar({
    editor,
    user,
    suggestingMode,
    suggestingForced,
    onSuggestingModeChange,
    leftPaneState,
    rightPaneState,
    leftPaneTab,
    rightPaneTab,
    onToggleLeftPane,
    onToggleRightPane,
}: ToolbarProps) {
    const { t } = useTranslation('editor');

    return (
        <TooltipPrimitive.Provider delayDuration={400}>
            <div className={`toolbar${suggestingMode ? ' is-suggesting' : ''}`} role="toolbar" aria-label={t('toolbar.ariaLabel')}>
                <button
                    type="button"
                    className={`tb-pane-btn tb-pane-btn--left${leftPaneState === PaneState.Expanded ? ' is-active' : ''}`}
                    onClick={onToggleLeftPane}
                    aria-pressed={leftPaneState === PaneState.Expanded}
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

                <PaneToggleZone
                    user={user}
                    suggestingMode={suggestingMode}
                    suggestingForced={suggestingForced}
                    onSuggestingModeChange={onSuggestingModeChange}
                />
                <button
                    type="button"
                    className={`tb-pane-btn tb-pane-btn--right${rightPaneState === PaneState.Expanded ? ' is-active' : ''}`}
                    onClick={onToggleRightPane}
                    aria-pressed={rightPaneState === PaneState.Expanded}
                    aria-label={t('topbar.toggleRightPane')}
                >
                    <span>{rightPaneTab}</span>
                    <PanelRight size={14} />
                </button>
            </div>
        </TooltipPrimitive.Provider>
    );
}
