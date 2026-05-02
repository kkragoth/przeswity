import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EditorCanvas } from '@/editor/tiptap/EditorCanvas';
import { EMPTY_SLASH, type EditorViewProps, type SlashTriggerInfo } from '@/editor/tiptap/types';

import { useBlockHover } from '@/editor/tiptap/hooks/useBlockHover';
import { useBlockDrag, useBlockDragOver } from '@/editor/tiptap/hooks/useBlockDragDrop';
import { useAwarenessSync } from '@/editor/tiptap/hooks/useAwarenessSync';
import { useCommentScrollPulse } from '@/editor/tiptap/hooks/useCommentScrollPulse';
import { useHeaderFooterSync } from '@/editor/tiptap/hooks/useHeaderFooterSync';
import { useEditorContextMenu } from '@/editor/tiptap/hooks/useEditorContextMenu';
import { useEditorInit } from '@/editor/tiptap/hooks/useEditorInit';
import { useBlockMenu } from '@/editor/tiptap/hooks/useBlockMenu';
import { addCommentFromBubble, focusOnEmptyClick } from '@/editor/tiptap/hooks/useEditorInteractions';
import { createEditorContext } from '@/editor/tiptap/editorContext';

import { ROLE_PERMISSIONS } from '@/editor/identity/types';

export function EditorView({
    collab,
    user,
    suggestingMode,
    suggestingForced: _suggestingForced = false,
    onSuggestingModeChange: _onSuggestingModeChange,
    activeCommentId,
    glossaryEntries,
    onActiveCommentChange,
    onCreateComment,
    onEditorReady,
    onToast,
}: EditorViewProps) {
    const { t } = useTranslation('editor');

    // Single context cell replacing 5 mutable refs — initialized before first useEditor call.
    const ctx = useMemo(() => createEditorContext({
        user,
        suggesting: suggestingMode,
        glossary: glossaryEntries,
    }), []); // eslint-disable-line react-hooks/exhaustive-deps

    // Keep snapshot in sync before any TipTap event handlers can fire on this render.
    // onHeaderClick / onFooterClick are injected by useHeaderFooterSync below.
    useLayoutEffect(() => {
        ctx.update({
            ...ctx.get(),
            user,
            suggesting: suggestingMode,
            glossary: glossaryEntries,
        });
    });

    const perms = ROLE_PERMISSIONS[user.role];
    const canEditOrSuggest = perms.canEdit || perms.canSuggest;

    const blockMenu = useBlockMenu();
    const [slashTrigger, setSlashTrigger] = useState<SlashTriggerInfo>(EMPTY_SLASH);

    const { dragStateRef, dropTop, setDropTop, resetDrag } = useBlockDrag();

    const { editor } = useEditorInit({
        collab,
        user,
        placeholder: '',
        canEditOrSuggest,
        ctx,
        dragStateRef,
        resetDrag,
        setSlashTrigger,
        onActiveCommentChange,
    });

    // useHeaderFooterSync injects onHeaderClick / onFooterClick into ctx each render.
    const { headerFooterFocus, setHeaderFooterFocus, applyHeaderFooter } = useHeaderFooterSync({
        collab,
        editor,
        ctx,
    });

    const { contextMenu, setContextMenu } = useEditorContextMenu({
        editor,
        collab,
        ctx,
        onCreateComment,
        onActiveCommentChange,
    });

    useEffect(() => {
        if (editor) editor.setEditable(canEditOrSuggest);
    }, [editor, canEditOrSuggest]);

    useEffect(() => {
        if (editor) onEditorReady(editor);
    }, [editor, onEditorReady]);

    useAwarenessSync(editor, collab.provider, user);

    // Block-handle hover state + drag-over indicator — both install once editor is ready
    const hoveredBlock = useBlockHover(editor);
    useBlockDragOver(editor, dragStateRef, setDropTop); // setDropTop from useBlockDrag

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
