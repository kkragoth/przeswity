import './styles.css'
import { useEffect, useMemo, useState } from 'react'
import type { Editor } from '@tiptap/react'

import { EditorView } from './editor/EditorView'
import { FindReplaceBar } from './editor/find/FindReplaceBar'
import { ShortcutsModal } from './workflow/ShortcutsModal'
import { useGlossary } from './glossary/GlossaryPanel'
import { ToastProvider, useToast } from './shell/Toast'
import { createCollab, type CollabBundle } from './collab/yDoc'
import type { User, Role } from './identity/types'

import { TopBar } from './app/TopBar'
import { StatusBar } from './app/StatusBar'
import { LeftPane, type LeftTab } from './app/LeftPane'
import { RightPane, type RightTab } from './app/RightPane'
import { usePeers } from './app/usePeers'
import { useConnectionStatus } from './app/useConnectionStatus'
import { useTargetWords } from './app/useTargetWords'
import { useReadingStats } from './app/useReadingStats'
import { useGlobalShortcuts } from './app/useGlobalShortcuts'

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

function EditorSession({ bookId, bookTitle, user, collab }: SessionProps) {
    const toast = useToast();

    const [suggestingMode, setSuggestingMode] = useState(false);
    const [editor, setEditor] = useState<Editor | null>(null);
    const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
    const [pendingNew, setPendingNew] = useState<{ id: string; quote: string } | null>(null);
    const [rightTab, setRightTab] = useState<RightTab>('comments');
    const [leftTab, setLeftTab] = useState<LeftTab>('outline');
    const [findOpen, setFindOpen] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);

    const glossaryEntries = useGlossary(collab.doc);
    const peers = usePeers(collab.provider);
    const conn = useConnectionStatus(collab.provider);
    const targetWords = useTargetWords(collab.doc);
    const stats = useReadingStats(editor);
    useGlobalShortcuts({ findOpen, shortcutsOpen, setFindOpen, setShortcutsOpen });

    const suggestingForced = user.role === 'proofreader' || user.role === 'author';
    const effectiveSuggesting = suggestingMode || suggestingForced;

    useEffect(() => {
        if (suggestingForced && !suggestingMode) setSuggestingMode(true);
    }, [suggestingForced, suggestingMode]);

    useEffect(() => {
        if (!editor) return;
        editor.view.dispatch(editor.state.tr.setMeta('glossaryHighlight/refresh', true));
    }, [editor, glossaryEntries]);

    const charCount = editor?.storage.characterCount?.characters() ?? 0;
    const wordCount = editor?.storage.characterCount?.words() ?? 0;

    return (
        <div className="editor-host">
            <TopBar
                doc={collab.doc}
                room={bookId}
                user={user}
                bookTitle={bookTitle}
                suggestingMode={effectiveSuggesting}
                onSuggestingModeChange={setSuggestingMode}
                suggestingForced={suggestingForced}
                connStatus={conn.status}
                onReconnect={conn.reconnect}
                peers={peers}
                editor={editor}
                onCommentBellClick={() => setRightTab('comments')}
                onShortcutsOpen={() => setShortcutsOpen(true)}
                onToast={toast.show}
            />
            <main className="main-grid">
                <LeftPane
                    tab={leftTab}
                    onTabChange={setLeftTab}
                    doc={collab.doc}
                    user={user}
                    editor={editor}
                    onToast={toast.show}
                />
                <section className="center-pane">
                    <EditorView
                        collab={collab}
                        user={user}
                        suggestingMode={effectiveSuggesting}
                        activeCommentId={activeCommentId}
                        glossaryEntries={glossaryEntries}
                        onActiveCommentChange={(id) => {
                            setActiveCommentId(id);
                            if (id) setRightTab('comments');
                        }}
                        onCreateComment={(id, quote) => {
                            setPendingNew({ id, quote });
                            setRightTab('comments');
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
                        suggestingMode={effectiveSuggesting}
                        peerCount={peers.length}
                    />
                </section>
                <RightPane
                    tab={rightTab}
                    onTabChange={setRightTab}
                    doc={collab.doc}
                    editor={editor}
                    user={user}
                    peers={peers}
                    activeCommentId={activeCommentId}
                    onActiveCommentChange={setActiveCommentId}
                    pendingNew={pendingNew}
                    onPendingHandled={() => setPendingNew(null)}
                />
            </main>
            {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}
        </div>
    );
}

function EditorHostInner({ bookId, user: userProp, bookTitle }: EditorHostProps) {
    const [collab, setCollab] = useState<CollabBundle | null>(null);

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

    if (!collab) {
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
