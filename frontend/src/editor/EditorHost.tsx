import './styles.css';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { applyTypographyToCssVars } from '@/editor/io/typography-css';
import { FONT_VARIANTS } from '@/editor/io/typography';

import { EditorView } from './editor/EditorView';
import { FindReplaceBar } from './editor/find/FindReplaceBar';
import { ShortcutsModal } from './workflow/ShortcutsModal';
import { useGlossary } from './glossary/GlossaryPanel';
import { ToastProvider, useToast } from './shell/Toast';
import { createCollab, type CollabBundle } from './collab/yDoc';
import type { User, Role } from './identity/types';

import { TopBar } from './app/TopBar';
import { StatusBar } from './app/StatusBar';
import { LeftPane, type LeftTab } from './app/LeftPane';
import { RightPane, type RightTab } from './app/RightPane';
import { usePeers } from './app/usePeers';
import { useConnectionStatus } from './app/useConnectionStatus';
import { useTargetWords } from './app/useTargetWords';
import { useReadingStats } from './app/useReadingStats';
import { useGlobalShortcuts } from './app/useGlobalShortcuts';
import { useSuggestingMode } from './app/useSuggestingMode';
import { usePaneState, PaneState } from './app/usePaneState';
import { Toolbar } from './editor/Toolbar';

interface EditorHostProps {
    bookId: string;
    user: { id: string; name: string; color: string; role: string };
    bookTitle: string;
}

interface SessionProps {
    bookId: string;
    bookTitle: string;
    user: User;
    collab: CollabBundle;
}

function paneClass(side: 'left' | 'right', state: PaneState): string {
    if (state === PaneState.Expanded) return `pane-${side}-open`;
    return `pane-${side}-${state}`;
}

function EditorSession({ bookId, bookTitle, user, collab }: SessionProps) {
    const toast = useToast();

    const [editor, setEditor] = useState<Editor | null>(null);
    const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
    const [pendingNew, setPendingNew] = useState<{ id: string; quote: string } | null>(null);
    const [rightTab, setRightTab] = useState<RightTab>('comments');
    const [leftTab, setLeftTab] = useState<LeftTab>('outline');
    const [findOpen, setFindOpen] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);

    const { t } = useTranslation('editor');
    const suggesting = useSuggestingMode(collab.doc, user.role);
    const leftPane = usePaneState('left', PaneState.Expanded);
    const rightPane = usePaneState('right', PaneState.Expanded);

    const leftTabLabels: Record<LeftTab, string> = {
        outline: t('pane.outline'),
        versions: t('pane.versions'),
        glossary: t('pane.glossary'),
        meta: t('pane.meta'),
        files: t('pane.files'),
    };
    const rightTabLabels: Record<RightTab, string> = {
        comments: t('pane.comments'),
        suggestions: t('pane.suggestions'),
    };

    const glossaryEntries = useGlossary(collab.doc);
    const peers = usePeers(collab.provider);
    const conn = useConnectionStatus(collab.provider);
    const targetWords = useTargetWords(collab.doc);
    const stats = useReadingStats(editor);
    useGlobalShortcuts({ findOpen, shortcutsOpen, setFindOpen, setShortcutsOpen });

    useEffect(() => {
        if (!editor) return;
        editor.view.dispatch(editor.state.tr.setMeta('glossaryHighlight/refresh', true));
    }, [editor, glossaryEntries]);

    const charCount = editor?.storage.characterCount?.characters() ?? 0;
    const wordCount = editor?.storage.characterCount?.words() ?? 0;

    const hostClassName = ['editor-host', paneClass('left', leftPane.state), paneClass('right', rightPane.state)]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={hostClassName}>
            <TopBar
                doc={collab.doc}
                room={bookId}
                user={user}
                bookTitle={bookTitle}
                connStatus={conn.status}
                onReconnect={conn.reconnect}
                peers={peers}
                onCommentBellClick={() => {
                    setRightTab('comments');
                    rightPane.expand();
                }}
                onShortcutsOpen={() => setShortcutsOpen(true)}
            />
            <main className="main-grid">
                <LeftPane
                    tab={leftTab}
                    onTabChange={setLeftTab}
                    paneState={leftPane.state}
                    onExpand={leftPane.expand}
                    onRail={leftPane.rail}
                    onHide={leftPane.hide}
                    doc={collab.doc}
                    user={user}
                    editor={editor}
                    onToast={toast.show}
                />
                {leftPane.isHidden && (
                    <button
                        type="button"
                        className="pane-handle pane-handle-left"
                        title={t('pane.expand')}
                        onClick={leftPane.expand}
                    >
                        <ChevronRight size={14} />
                    </button>
                )}
                <section className="center-pane">
                    {editor && (
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
                    )}
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
                            if (id) {
                                setRightTab('comments');
                                rightPane.expand();
                            }
                        }}
                        onCreateComment={(id, quote) => {
                            setPendingNew({ id, quote });
                            setRightTab('comments');
                            rightPane.expand();
                        }}
                        onEditorReady={setEditor}
                        onToast={toast.show}
                    />
                    <FindReplaceBar
                        editor={editor}
                        open={findOpen}
                        onClose={() => setFindOpen(false)}
                    />
                    <StatusBar
                        wordCount={wordCount}
                        charCount={charCount}
                        stats={stats}
                        targetWords={targetWords}
                        user={user}
                        suggestingMode={suggesting.effective}
                        peerCount={peers.length}
                    />
                </section>
                <RightPane
                    tab={rightTab}
                    onTabChange={setRightTab}
                    paneState={rightPane.state}
                    onExpand={rightPane.expand}
                    onRail={rightPane.rail}
                    onHide={rightPane.hide}
                    doc={collab.doc}
                    editor={editor}
                    user={user}
                    peers={peers}
                    activeCommentId={activeCommentId}
                    onActiveCommentChange={setActiveCommentId}
                    pendingNew={pendingNew}
                    onPendingHandled={() => setPendingNew(null)}
                />
                {rightPane.isHidden && (
                    <button
                        type="button"
                        className="pane-handle pane-handle-right"
                        title={t('pane.expand')}
                        onClick={rightPane.expand}
                    >
                        <ChevronLeft size={14} />
                    </button>
                )}
            </main>
            {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}
        </div>
    );
}

function EditorHostInner({ bookId, user: userProp, bookTitle }: EditorHostProps) {
    const [collab, setCollab] = useState<CollabBundle | null>(null);
    const [fontsReady, setFontsReady] = useState(false);

    useLayoutEffect(() => {
        applyTypographyToCssVars();
    }, []);

    useEffect(() => {
        let cancelled = false;
        Promise.all(
            FONT_VARIANTS.map((v) =>
                document.fonts.load(`${v.weight} ${v.style} 16px '${v.family}'`),
            ),
        ).then(() => {
            if (!cancelled) setFontsReady(true);
        });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const bundle = createCollab(bookId);
        setCollab(bundle);
        return () => {
            bundle.provider.destroy();
            bundle.persistence.destroy();
            bundle.doc.destroy();
            setCollab((current) => (current === bundle ? null : current));
        };
    }, [bookId]);

    const user: User = useMemo(
        () => ({
            id: userProp.id,
            name: userProp.name,
            color: userProp.color,
            role: userProp.role as Role,
        }),
        [userProp.id, userProp.name, userProp.color, userProp.role],
    );

    if (!collab || !fontsReady) {
        return <div className="editor-host editor-host-loading" />;
    }

    return (
        <EditorSession
            key={collab.id}
            bookId={bookId}
            bookTitle={bookTitle}
            user={user}
            collab={collab}
        />
    );
}

export function EditorHost(props: EditorHostProps) {
    return (
        <ToastProvider>
            <EditorHostInner {...props} />
        </ToastProvider>
    );
}
