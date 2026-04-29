import type { Editor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import {
    Bold, Italic, Underline, Strikethrough, Code,
    List, ListOrdered, ListChecks, Link2, Undo2, Redo2,
    PanelLeft, PanelRight,
} from 'lucide-react';

import { SpecialCharsMenu } from './formatting/SpecialCharsMenu';
import { StyleDropdown } from './StyleDropdown';
import { FileMenu } from './FileMenu';
import { TbBtn, ModeToggle, HighlightBtn } from './ToolbarPrimitives';
import type { User } from '../identity/types';
import { ROLE_PERMISSIONS } from '../identity/types';
import type { PaneState } from '@/editor/app/usePaneState';

export interface ToolbarProps {
    editor: Editor
    user: User
    suggestingMode: boolean
    suggestingForced: boolean
    onSuggestingModeChange: (mode: boolean) => void
    onToast: (msg: string, kind?: 'info' | 'success' | 'error') => void
    leftPaneState: PaneState
    rightPaneState: PaneState
    leftPaneTab: string
    rightPaneTab: string
    onToggleLeftPane: () => void
    onToggleRightPane: () => void
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const M = isMac ? '⌘' : 'Ctrl';

function hasNoAccess(user: User): boolean {
    const p = ROLE_PERMISSIONS[user.role];
    return !p.canEdit && !p.canSuggest;
}

function Divider() {
    return <div className="tb-divider" aria-hidden />;
}

export function Toolbar({
    editor,
    user,
    suggestingMode,
    suggestingForced,
    onSuggestingModeChange,
    onToast,
    leftPaneState,
    rightPaneState,
    leftPaneTab,
    rightPaneTab,
    onToggleLeftPane,
    onToggleRightPane,
}: ToolbarProps) {
    const { t } = useTranslation('editor');
    const perms = ROLE_PERMISSIONS[user.role];

    const setLink = () => {
        const prev = editor.getAttributes('link').href as string | undefined;
        const url = window.prompt('Link URL', prev ?? 'https://');
        if (url === null) return;
        if (url === '') { editor.chain().focus().unsetLink().run(); return; }
        editor.chain().focus().setLink({ href: url }).run();
    };

    return (
        <TooltipPrimitive.Provider delayDuration={400}>
            <div className={`toolbar${suggestingMode ? ' is-suggesting' : ''}`} role="toolbar" aria-label="Editor toolbar">
                <button
                    type="button"
                    className={`tb-pane-btn tb-pane-btn--left${leftPaneState === 'expanded' ? ' is-active' : ''}`}
                    onClick={onToggleLeftPane}
                    aria-pressed={leftPaneState === 'expanded'}
                >
                    <PanelLeft size={14} />
                    <span>{leftPaneTab}</span>
                </button>
                {/* Zone 1 — Mode toggle (hidden for roles with no access) */}
                {!hasNoAccess(user) && (
                    <>
                        <ModeToggle
                            suggestingMode={suggestingMode}
                            suggestingForced={suggestingForced}
                            onSuggestingModeChange={onSuggestingModeChange}
                        />
                        <Divider />
                    </>
                )}

                {/* Zone 2 — Block style */}
                <StyleDropdown editor={editor} />
                <Divider />

                {/* Zone 3 — Inline formatting */}
                <div className="tb-group">
                    <TbBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} label={t('toolbar.bold')} shortcut={`${M}B`}><Bold size={14} /></TbBtn>
                    <TbBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} label={t('toolbar.italic')} shortcut={`${M}I`}><Italic size={14} /></TbBtn>
                    <TbBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} label={t('toolbar.underline')} shortcut={`${M}U`}><Underline size={14} /></TbBtn>
                    <TbBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} label={t('toolbar.strike')}><Strikethrough size={14} /></TbBtn>
                    <TbBtn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} label={t('toolbar.code')}><Code size={14} /></TbBtn>
                    <HighlightBtn editor={editor} label={t('toolbar.highlight')} />
                </div>
                <Divider />

                <div className="tb-group">
                    <TbBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} label={t('toolbar.bulletList')}><List size={14} /></TbBtn>
                    <TbBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} label={t('toolbar.orderedList')}><ListOrdered size={14} /></TbBtn>
                    <TbBtn active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} label={t('toolbar.taskList')}><ListChecks size={14} /></TbBtn>
                </div>
                <Divider />

                <div className="tb-group">
                    <TbBtn active={editor.isActive('link')} onClick={setLink} label={t('toolbar.link')} shortcut={`${M}K`}><Link2 size={14} /></TbBtn>
                    <SpecialCharsMenu editor={editor} />
                </div>
                <Divider />

                <div className="tb-group">
                    <TbBtn active={false} onClick={() => editor.chain().focus().undo().run()} label={t('toolbar.undo')} shortcut={`${M}Z`}><Undo2 size={14} /></TbBtn>
                    <TbBtn active={false} onClick={() => editor.chain().focus().redo().run()} label={t('toolbar.redo')} shortcut={`${M}⇧Z`}><Redo2 size={14} /></TbBtn>
                </div>

                {/* Far right — File menu */}
                <div className="tb-spacer" />
                <FileMenu editor={editor} perms={perms} onToast={onToast} />
                <button
                    type="button"
                    className={`tb-pane-btn tb-pane-btn--right${rightPaneState === 'expanded' ? ' is-active' : ''}`}
                    onClick={onToggleRightPane}
                    aria-pressed={rightPaneState === 'expanded'}
                >
                    <span>{rightPaneTab}</span>
                    <PanelRight size={14} />
                </button>
            </div>
        </TooltipPrimitive.Provider>
    );
}
