import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';
import { HeaderFooterKind } from '@/editor/tiptap/HeaderFooterBar';
import { EditorCanvas } from '@/editor/tiptap/EditorCanvas';
import { EMPTY_SLASH, type EditorViewProps, type SlashTriggerInfo } from '@/editor/tiptap/types';

import { useBlockHover } from './hooks/useBlockHover';
import { useBlockDragOver, INITIAL_DRAG_STATE, type DragState } from './hooks/useBlockDragDrop';
import { useCommentScrollPulse } from './hooks/useCommentScrollPulse';
import { useHeaderFooterSync } from './hooks/useHeaderFooterSync';
import { useEditorContextMenu } from './hooks/useEditorContextMenu';
import { useEditorInit } from './hooks/useEditorInit';
import { useBlockMenu } from './hooks/useBlockMenu';
import { addCommentFromBubble, focusOnEmptyClick } from '@/editor/tiptap/hooks/useEditorInteractions';

import type { CollabBundle } from '@/editor/collab/yDoc';
import type { User } from '@/editor/identity/types';
import { ROLE_PERMISSIONS } from '@/editor/identity/types';

export function EditorView({
    collab,
    user,
    suggestingMode,
    suggestingForced = false,
    onSuggestingModeChange,
    activeCommentId,
    glossaryEntries,
    onActiveCommentChange,
    onCreateComment,
    onEditorReady,
    onToast,
}: EditorViewProps) {
    const { t } = useTranslation('editor');

    // Live refs so extension getters never see stale closure values
    const userRef = useRef(user);
    userRef.current = user;
    const suggestingRef = useRef(suggestingMode);
    suggestingRef.current = suggestingMode;
    const glossaryRef = useRef(glossaryEntries);
    glossaryRef.current = glossaryEntries;

    const perms = ROLE_PERMISSIONS[user.role];
    const canEditOrSuggest = perms.canEdit || perms.canSuggest;

    const blockMenu = useBlockMenu();
    const [slashTrigger, setSlashTrigger] = useState<SlashTriggerInfo>(EMPTY_SLASH);

    const dragStateRef = useRef<DragState>({ ...INITIAL_DRAG_STATE });
    const [dropTop, setDropTop] = useState<number | null>(null);
    const resetDrag = () => {
        dragStateRef.current = { ...INITIAL_DRAG_STATE };
        setDropTop(null);
    };

    // Stable refs captured by PaginationPlus on extension build — updated each render by the sync hook
    const onHeaderClickRef = useRef<(() => void) | undefined>(undefined);
    const onFooterClickRef = useRef<(() => void) | undefined>(undefined);

    const { editor } = useEditorInit({
        collab,
        user,
        placeholder: '',
        canEditOrSuggest,
        userRef,
        suggestingRef,
        glossaryRef,
        onHeaderClickRef,
        onFooterClickRef,
        dragStateRef,
        resetDrag,
        setSlashTrigger,
        onActiveCommentChange,
    });

    const { headerFooterFocus, setHeaderFooterFocus, applyHeaderFooter } = useHeaderFooterSync({
        collab,
        editor,
        onHeaderClickRef,
        onFooterClickRef,
    });

    const { contextMenu, setContextMenu } = useEditorContextMenu({
        editor,
        collab,
        userRef,
        onCreateComment,
        onActiveCommentChange,
    });

    useEffect(() => {
        if (editor) editor.setEditable(canEditOrSuggest);
    }, [editor, canEditOrSuggest]);

    useEffect(() => {
        if (editor) onEditorReady(editor);
    }, [editor, onEditorReady]);

    // Awareness: keep our user info in sync with provider
    useEffect(() => {
        if (!editor) return;
        collab.provider.awareness?.setLocalStateField('user', {
            name: user.name,
            color: user.color,
        });
    }, [collab.provider, editor, user.name, user.color]);

    // Block-handle hover state + drag-over indicator — both install once editor is ready
    const hoveredBlock = useBlockHover(editor);
    useBlockDragOver(editor, dragStateRef, setDropTop);

    useCommentScrollPulse(editor, activeCommentId);

    return (
        <EditorCanvas
            editor={editor}
            collab={collab}
            user={user}
            perms={{ canComment: perms.canComment }}
            suggestingMode={suggestingMode}
            activeCommentId={activeCommentId}
            onActiveCommentChange={onActiveCommentChange}
            addCommentFromBubble={() => addCommentFromBubble(editor, onCreateComment)}
            canEditOrSuggest={canEditOrSuggest}
            hoveredBlock={hoveredBlock}
            dragStateRef={dragStateRef}
            resetDrag={resetDrag}
            dropTop={dropTop}
            blockMenu={blockMenu}
            contextMenu={contextMenu}
            setContextMenu={setContextMenu}
            slashTrigger={slashTrigger}
            setSlashTrigger={setSlashTrigger}
            onToast={onToast}
            t={t}
            headerFooterFocus={headerFooterFocus}
            applyHeaderFooter={applyHeaderFooter}
            setHeaderFooterFocus={setHeaderFooterFocus}
            focusOnEmptyClick={(e) => focusOnEmptyClick(e, editor, canEditOrSuggest)}
        />
    );
}
