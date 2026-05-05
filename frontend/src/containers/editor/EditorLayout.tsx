import { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EditorView } from '@/editor/tiptap';
import { FindReplaceBar } from '@/editor/tiptap/find/FindReplaceBar';
import { Toolbar } from '@/editor/tiptap/toolbar';
import { useGlossary } from '@/containers/editor/glossary/hooks/useGlossary';
import { ShortcutsModal } from '@/containers/editor/workflow/ShortcutsModal';
import { TopBar } from '@/containers/editor/layout/TopBar';
import { LeftPane } from '@/containers/editor/layout/LeftPane';
import { RightPane, RightTab } from '@/containers/editor/layout/RightPane';
import { StatusBar } from '@/containers/editor/layout/StatusBar';
import { useDocumentKeyDown } from '@/containers/editor/hooks/useDocumentKeyDown';
import { useNarrowLayout } from '@/containers/editor/hooks/useNarrowLayout';
import { PaneState, paneClass, usePaneStore } from '@/containers/editor/session/paneStore';
import { useEditor } from '@/containers/editor/session/LiveProvider';
import { useSession, useSessionStore } from '@/containers/editor/SessionStoreProvider';
import { EditorZoomProvider } from '@/contexts/EditorZoomContext';
import type { CollabBundle } from '@/editor/collab/yDoc';
import { useAutoSnapshot } from '@/containers/editor/versions/hooks/useAutoSnapshot';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useEditorViewStore, EditorViewKind } from '@/containers/editor/session/editorViewStore';
import { VersionHistoryView } from '@/containers/editor/versions/VersionHistoryView';
import { SuggestionBubble } from '@/containers/editor/suggestions/SuggestionBubble';

interface EditorLayoutProps {
    collab: CollabBundle
}

export function EditorLayout({ collab }: EditorLayoutProps) {
    const { t } = useTranslation('editor');
    const editor = useEditor();
    const sessionStore = useSessionStore();
    const { bookId } = useEditorSession();

    useAutoSnapshot(collab.doc, bookId);
    const shortcutsOpen = useSession((s) => s.shortcutsOpen);
    const editorView = useEditorViewStore((s) => s.view);

    const left = usePaneStore((s) => s.left);
    const right = usePaneStore((s) => s.right);
    const expandPane = usePaneStore((s) => s.expand);
    const showSide = usePaneStore((s) => s.showSide);
    const dismissBoth = usePaneStore((s) => s.dismissBoth);

    const narrow = useNarrowLayout();
    const glossaryEntries = useGlossary(collab.doc);
    useDocumentKeyDown();

    useEffect(() => {
        if (!editor) return;
        editor.view.dispatch(editor.state.tr.setMeta('glossaryHighlight/refresh', true));
    }, [editor, glossaryEntries]);

    const isCompareView = editorView.kind === EditorViewKind.VersionHistory;
    const hostClassName = [
        'editor-host',
        paneClass('left', left),
        paneClass('right', right),
        isCompareView ? 'editor-host--compare' : '',
    ].filter(Boolean).join(' ');

    const handleActiveCommentChange = (id: string | null) => {
        sessionStore.getState().setActiveComment(id);
        if (id) {
            sessionStore.getState().setRightTab(RightTab.Comments);
            expandPane('right');
        }
    };

    const handleCreateComment = (id: string, quote: string) => {
        sessionStore.getState().enqueuePendingComment({ id, quote });
        sessionStore.getState().setRightTab(RightTab.Comments);
        expandPane('right');
    };

    return (
        <EditorZoomProvider className={hostClassName}>
            <TopBar editor={editor} />
            <main className="main-grid">
                {!isCompareView && <LeftPane editor={editor} />}
                {!isCompareView && left === PaneState.Hidden ? (
                    <button
                        type="button"
                        className="pane-handle pane-handle-left"
                        title={t('pane.expand')}
                        onClick={() => showSide('left', narrow)}
                    >
                        <ChevronRight size={14} />
                    </button>
                ) : null}
                <section className="center-pane">
                    {isCompareView && (
                        <VersionHistoryView editor={editor} />
                    )}
                    <div style={{ display: isCompareView ? 'none' : 'contents' }}>
                        {editor ? <Toolbar editor={editor} /> : null}
                        <EditorView
                            collab={collab}
                            glossaryEntries={glossaryEntries}
                            onActiveCommentChange={handleActiveCommentChange}
                            onCreateComment={handleCreateComment}
                        />
                        {editor ? <SuggestionBubble editor={editor} /> : null}
                        <FindReplaceBar editor={editor} />
                        <StatusBar editor={editor} />
                    </div>
                </section>
                {!isCompareView && <RightPane editor={editor} />}
                {!isCompareView && right === PaneState.Hidden ? (
                    <button
                        type="button"
                        className="pane-handle pane-handle-right"
                        title={t('pane.expand')}
                        onClick={() => showSide('right', narrow)}
                    >
                        <ChevronLeft size={14} />
                    </button>
                ) : null}
            </main>
            {narrow && (left === PaneState.Expanded || right === PaneState.Expanded) ? (
                <button
                    type="button"
                    className="pane-backdrop"
                    aria-label={t('pane.close')}
                    onClick={dismissBoth}
                />
            ) : null}
            {shortcutsOpen ? <ShortcutsModal /> : null}
        </EditorZoomProvider>
    );
}
