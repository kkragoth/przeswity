import '@/editor/styles.css';
import { useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EditorView } from '@/editor/tiptap/EditorView';
import { FindReplaceBar } from '@/editor/tiptap/find/FindReplaceBar';
import { useToast } from '@/editor/shell/useToast';
import type { User, Role } from '@/editor/identity/types';
import { Toolbar } from '@/editor/tiptap/Toolbar';
import { useGlossary } from '@/containers/editor/components/glossary/GlossaryPanel';
import { ShortcutsModal } from '@/containers/editor/components/workflow/ShortcutsModal';
import { TopBar } from '@/containers/editor/components/TopBar';
import { LeftPane, LeftTab } from '@/containers/editor/components/LeftPane';
import { RightPane, RightTab } from '@/containers/editor/components/RightPane';
import { StatusBar } from '@/containers/editor/components/StatusBar';
import { useDocumentKeyDown } from '@/containers/editor/hooks/useDocumentKeyDown';
import { useCollabSession } from '@/containers/editor/hooks/useCollabSession';
import { useFontsReady } from '@/containers/editor/hooks/useFontsReady';
import { useInitialSync } from '@/containers/editor/hooks/useInitialSync';
import { FONT_VARIANTS } from '@/editor/io/typography';
import type { CollabBundle } from '@/editor/collab/yDoc';
import { useNarrowLayout } from '@/containers/editor/hooks/useNarrowLayout';
import { EditorSkeleton } from '@/containers/editor/components/EditorSkeleton';
import { PaneState, paneClass, usePaneStore } from '@/containers/editor/stores/paneStore';
import { EditorSessionProvider } from '@/containers/editor/EditorSessionProvider';
import { EditorLiveProvider, useEditor } from '@/containers/editor/EditorLiveProvider';
import { SessionStoreProvider, useSession, useSessionStore } from '@/containers/editor/SessionStoreProvider';
import { CommentsStoreProvider } from '@/containers/editor/CommentsStoreProvider';

interface EditorHostProps {
    bookId: string;
    user: { id: string; name: string; color: string; role: string };
    bookTitle: string;
}

function EditorSession({ bookId, bookTitle, user, collab }: {
    bookId: string;
    bookTitle: string;
    user: User;
    collab: CollabBundle;
}) {
    const toast = useToast();
    return (
        <EditorSessionProvider user={user} bookId={bookId} collab={collab} toast={toast.show}>
            <EditorLiveProvider>
                <SessionStoreProvider>
                    <CommentsStoreProvider>
                        <EditorSessionUI bookTitle={bookTitle} collab={collab} />
                    </CommentsStoreProvider>
                </SessionStoreProvider>
            </EditorLiveProvider>
        </EditorSessionProvider>
    );
}

function EditorSessionUI({ bookTitle, collab }: { bookTitle: string; collab: CollabBundle }) {
    const { t } = useTranslation('editor');
    const editor = useEditor();
    const sessionStore = useSessionStore();
    const leftTab = useSession((s) => s.leftTab);
    const rightTab = useSession((s) => s.rightTab);
    const shortcutsOpen = useSession((s) => s.shortcutsOpen);

    const left = usePaneStore((s) => s.left);
    const right = usePaneStore((s) => s.right);
    const expandPane = usePaneStore((s) => s.expand);
    const showSide = usePaneStore((s) => s.showSide);
    const togglePane = usePaneStore((s) => s.toggle);
    const dismissBoth = usePaneStore((s) => s.dismissBoth);

    const narrow = useNarrowLayout();
    const glossaryEntries = useGlossary(collab.doc);
    useDocumentKeyDown();

    const expandLeft = () => showSide('left', narrow);
    const expandRight = () => showSide('right', narrow);
    const toggleLeft = () => togglePane('left', narrow);
    const toggleRight = () => togglePane('right', narrow);
    const drawerOpen = narrow && (left === PaneState.Expanded || right === PaneState.Expanded);

    useEffect(() => {
        if (!editor) return;
        editor.view.dispatch(editor.state.tr.setMeta('glossaryHighlight/refresh', true));
    }, [editor, glossaryEntries]);

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

    const hostClassName = ['editor-host', paneClass('left', left), paneClass('right', right)].join(' ');

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
        <div className={hostClassName}>
            <TopBar
                bookTitle={bookTitle}
                editor={editor}
            />
            <main className="main-grid">
                <LeftPane editor={editor} />
                {left === PaneState.Hidden ? (
                    <button
                        type="button"
                        className="pane-handle pane-handle-left"
                        title={t('pane.expand')}
                        onClick={expandLeft}
                    >
                        <ChevronRight size={14} />
                    </button>
                ) : null}
                <section className="center-pane">
                    {editor ? (
                        <Toolbar
                            editor={editor}
                            leftPaneTab={leftTabLabels[leftTab]}
                            rightPaneTab={rightTabLabels[rightTab]}
                            onToggleLeftPane={toggleLeft}
                            onToggleRightPane={toggleRight}
                        />
                    ) : null}
                    <EditorView
                        collab={collab}
                        glossaryEntries={glossaryEntries}
                        onActiveCommentChange={handleActiveCommentChange}
                        onCreateComment={handleCreateComment}
                    />
                    <FindReplaceBar editor={editor} />
                    <StatusBar editor={editor} />
                </section>
                <RightPane editor={editor} />
                {right === PaneState.Hidden ? (
                    <button
                        type="button"
                        className="pane-handle pane-handle-right"
                        title={t('pane.expand')}
                        onClick={expandRight}
                    >
                        <ChevronLeft size={14} />
                    </button>
                ) : null}
            </main>
            {drawerOpen ? (
                <button
                    type="button"
                    className="pane-backdrop"
                    aria-label={t('pane.close')}
                    onClick={dismissBoth}
                />
            ) : null}
            {shortcutsOpen ? <ShortcutsModal /> : null}
        </div>
    );
}

export function EditorHost({ bookId, user: userProp, bookTitle }: EditorHostProps) {
    const { collab } = useCollabSession({ bookId });
    const fontsReady = useFontsReady(FONT_VARIANTS);
    const syncDone = useInitialSync(collab);
    const ready = Boolean(collab) && fontsReady && syncDone;
    const user: User = useMemo(
        () => ({ id: userProp.id, name: userProp.name, color: userProp.color, role: userProp.role as Role }),
        [userProp.id, userProp.name, userProp.color, userProp.role],
    );
    if (!ready || !collab) return <EditorSkeleton bookTitle={bookTitle} />;
    return <EditorSession key={collab.id} bookId={bookId} bookTitle={bookTitle} user={user} collab={collab} />;
}
