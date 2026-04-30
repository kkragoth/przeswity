import '@/editor/styles.css';
import { useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { FONT_VARIANTS } from '@/editor/io/typography';
import { EditorView } from '@/editor/tiptap/EditorView';
import { FindReplaceBar } from '@/editor/tiptap/find/FindReplaceBar';
import { ToastProvider, useToast } from '@/editor/shell/Toast';
import type { User, Role } from '@/editor/identity/types';
import { ROLE_PERMISSIONS } from '@/editor/identity/types';
import { Toolbar } from '@/editor/tiptap/Toolbar';
import { useGlossary } from '@/containers/editor/components/glossary/GlossaryPanel';
import { ShortcutsModal } from '@/containers/editor/components/workflow/ShortcutsModal';
import { TopBar } from '@/containers/editor/components/TopBar';
import { LeftPane, LeftTab } from '@/containers/editor/components/LeftPane';
import { RightPane, RightTab } from '@/containers/editor/components/RightPane';
import { StatusBar } from '@/containers/editor/components/StatusBar';
import { usePeers } from '@/containers/editor/hooks/usePeers';
import { useConnectionStatus } from '@/containers/editor/hooks/useConnectionStatus';
import { useTargetWords } from '@/containers/editor/hooks/useTargetWords';
import { useReadingStats } from '@/containers/editor/hooks/useReadingStats';
import { useDocumentKeyDown } from '@/containers/editor/hooks/useDocumentKeyDown';
import { useSuggestingMode } from '@/containers/editor/hooks/useSuggestingMode';
import { usePaneState, PaneState } from '@/containers/editor/hooks/usePaneState';
import { useCollabSession } from '@/containers/editor/hooks/useCollabSession';
import { useFontsReady } from '@/containers/editor/hooks/useFontsReady';
import { useInitialSync } from '@/containers/editor/hooks/useInitialSync';
import { EditorLayout } from '@/containers/editor/EditorLayout';
import { EditorSkeleton } from '@/containers/editor/components/EditorSkeleton';

interface EditorHostProps {
    bookId: string;
    user: { id: string; name: string; color: string; role: string };
    bookTitle: string;
}

function EditorSession({ bookId, bookTitle, user, collab }: {
    bookId: string;
    bookTitle: string;
    user: User;
    collab: ReturnType<typeof useCollabSession>['collab'] & { id: string };
}) {
    const toast = useToast();
    const { t } = useTranslation('editor');
    const [editor, setEditor] = useState<Editor | null>(null);
    const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
    const [pendingNew, setPendingNew] = useState<{ id: string; quote: string } | null>(null);
    const [rightTab, setRightTab] = useState<RightTab>(RightTab.Comments);
    const [leftTab, setLeftTab] = useState<LeftTab>(LeftTab.Outline);
    const [findOpen, setFindOpen] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);

    const suggesting = useSuggestingMode(collab.doc, user.role);
    const leftPane = usePaneState('left', PaneState.Expanded);
    const rightPane = usePaneState('right', PaneState.Expanded);
    const glossaryEntries = useGlossary(collab.doc);
    const peers = usePeers(collab.provider);
    const conn = useConnectionStatus(collab.provider);
    const targetWords = useTargetWords(collab.doc);
    const stats = useReadingStats(editor);
    useDocumentKeyDown({ findOpen, shortcutsOpen, setFindOpen, setShortcutsOpen });

    useEffect(() => {
        if (!editor) return;
        editor.view.dispatch(editor.state.tr.setMeta('glossaryHighlight/refresh', true));
    }, [editor, glossaryEntries]);

    const charCount = editor?.storage.characterCount?.characters() ?? 0;
    const wordCount = editor?.storage.characterCount?.words() ?? 0;
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

    return (
        <EditorLayout
            paneState={{ left: leftPane.state, right: rightPane.state }}
            topBar={<TopBar user={user} bookTitle={bookTitle} editor={editor} perms={ROLE_PERMISSIONS[user.role]} onToast={toast.show} />}
            leftPane={<LeftPane tab={leftTab} onTabChange={setLeftTab} paneState={leftPane.state} onExpand={leftPane.expand} onRail={leftPane.rail} onHide={leftPane.hide} doc={collab.doc} user={user} editor={editor} bookId={bookId} onToast={toast.show} />}
            leftHandle={leftPane.isHidden ? <button type="button" className="pane-handle pane-handle-left" title={t('pane.expand')} onClick={leftPane.expand}><ChevronRight size={14} /></button> : null}
            content={
                <>
                    {editor ? (
                        <Toolbar
                            editor={editor}
                            user={user}
                            suggestingMode={suggesting.effective}
                            suggestingForced={suggesting.forced}
                            onSuggestingModeChange={suggesting.setMode}
                            onToast={toast.show}
                            leftPaneState={leftPane.state}
                            rightPaneState={rightPane.state}
                            leftPaneTab={leftTabLabels[leftTab]}
                            rightPaneTab={rightTabLabels[rightTab]}
                            onToggleLeftPane={leftPane.cycle}
                            onToggleRightPane={rightPane.cycle}
                        />
                    ) : null}
                    <EditorView
                        collab={collab}
                        user={user}
                        suggestingMode={suggesting.effective}
                        suggestingForced={suggesting.forced}
                        onSuggestingModeChange={suggesting.setMode}
                        activeCommentId={activeCommentId}
                        glossaryEntries={glossaryEntries}
                        onActiveCommentChange={(id) => {
                            setActiveCommentId(id);
                            if (id) { setRightTab(RightTab.Comments); rightPane.expand(); }
                        }}
                        onCreateComment={(id, quote) => {
                            setPendingNew({ id, quote });
                            setRightTab(RightTab.Comments);
                            rightPane.expand();
                        }}
                        onEditorReady={setEditor}
                        onToast={toast.show}
                    />
                    <FindReplaceBar editor={editor} open={findOpen} onClose={() => setFindOpen(false)} />
                </>
            }
            statusBar={
                <StatusBar
                    wordCount={wordCount}
                    charCount={charCount}
                    stats={stats}
                    targetWords={targetWords}
                    user={user}
                    suggestingMode={suggesting.effective}
                    peers={peers}
                    editor={editor}
                    connStatus={conn.status}
                    onReconnect={conn.reconnect}
                />
            }
            rightPane={<RightPane tab={rightTab} onTabChange={setRightTab} onExpand={rightPane.expand} onHide={rightPane.hide} doc={collab.doc} editor={editor} user={user} peers={peers} activeCommentId={activeCommentId} onActiveCommentChange={setActiveCommentId} pendingNew={pendingNew} onPendingHandled={() => setPendingNew(null)} />}
            rightHandle={rightPane.isHidden ? <button type="button" className="pane-handle pane-handle-right" title={t('pane.expand')} onClick={rightPane.expand}><ChevronLeft size={14} /></button> : null}
            overlays={shortcutsOpen ? <ShortcutsModal onClose={() => setShortcutsOpen(false)} /> : null}
        />
    );
}

function EditorHostInner({ bookId, user: userProp, bookTitle }: EditorHostProps) {
    const { collab } = useCollabSession({ bookId });
    const fontsReady = useFontsReady(FONT_VARIANTS);
    const initialSyncDone = useInitialSync(collab);
    const user: User = useMemo(
        () => ({ id: userProp.id, name: userProp.name, color: userProp.color, role: userProp.role as Role }),
        [userProp.id, userProp.name, userProp.color, userProp.role],
    );
    if (!collab || !fontsReady || !initialSyncDone) return <EditorSkeleton bookTitle={bookTitle} />;
    return <EditorSession key={collab.id} bookId={bookId} bookTitle={bookTitle} user={user} collab={collab} />;
}

export function EditorHost(props: EditorHostProps) {
    return (
        <ToastProvider>
            <EditorHostInner {...props} />
        </ToastProvider>
    );
}
