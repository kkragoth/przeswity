import type { Editor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { PanelRight } from 'lucide-react';

import { StyleDropdown } from './StyleDropdown';
import { ModeToggle } from './Primitives';
import { PaneState, usePaneStore } from '@/containers/editor/session/paneStore';
import { TextFormattingZone } from '@/editor/tiptap/toolbar/TextFormattingZone';
import { BlockFormattingZone } from '@/editor/tiptap/toolbar/BlockFormattingZone';
import { InsertZone } from '@/editor/tiptap/toolbar/InsertZone';
import { useEditorLive } from '@/containers/editor/session/LiveProvider';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useSession } from '@/containers/editor/SessionStoreProvider';
import { RightTab } from '@/containers/editor/layout/RightPane';
import { useNarrowLayout } from '@/containers/editor/hooks/useNarrowLayout';

export interface ToolbarProps {
    editor: Editor;
}

function Divider() {
    return <div className="tb-divider" aria-hidden />;
}

export function Toolbar({ editor }: ToolbarProps) {
    const { t } = useTranslation('editor');
    const rightTab = useSession((s) => s.rightTab);
    const togglePane = usePaneStore((s) => s.toggle);
    const rightExpanded = usePaneStore((s) => s.right === PaneState.Expanded);
    const narrow = useNarrowLayout();
    const suggesting = useEditorLive((s) => s.suggesting);
    const suggestingMode = suggesting.effective;
    const { perms } = useEditorSession();
    const showModeToggle = perms.canEdit || perms.canSuggest;

    const rightTabLabels: Record<RightTab, string> = {
        [RightTab.Comments]: t('pane.comments'),
        [RightTab.Suggestions]: t('pane.suggestions'),
    };
    const rightPaneTab = rightTabLabels[rightTab];
    const onToggleRightPane = () => togglePane('right', narrow);

    return (
        <TooltipPrimitive.Provider delayDuration={400}>
            <div className={`toolbar${suggestingMode ? ' is-suggesting' : ''}`} role="toolbar" aria-label={t('toolbar.ariaLabel')}>
                <StyleDropdown editor={editor} />
                <Divider />
                <TextFormattingZone editor={editor} />
                <Divider />
                <BlockFormattingZone editor={editor} />
                <Divider />
                <InsertZone editor={editor} />

                <div className="tb-spacer" />
                {showModeToggle ? (
                    <ModeToggle
                        suggestingMode={suggestingMode}
                        suggestingForced={suggesting.forced}
                        onSuggestingModeChange={suggesting.setMode}
                    />
                ) : null}
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
