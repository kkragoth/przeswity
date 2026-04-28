import './styles.css'
import { useEffect, useMemo, useState } from 'react'
import type { Editor } from '@tiptap/react'

import { EditorView } from './editor/EditorView'
import { FindReplaceBar } from './editor/find/FindReplaceBar'
import { ShortcutsModal } from './workflow/ShortcutsModal'
import { useGlossary } from './glossary/GlossaryPanel'
import { ToastProvider, useToast } from './shell/Toast'
import { createCollab } from './collab/yDoc'
import type { User } from './identity/types'

import { TopBar } from './app/TopBar'
import { StatusBar } from './app/StatusBar'
import { LeftPane, type LeftTab } from './app/LeftPane'
import { RightPane, type RightTab } from './app/RightPane'
import { usePeers } from './app/usePeers'
import { useConnectionStatus } from './app/useConnectionStatus'
import { useDocumentTitle } from './app/useDocumentTitle'
import { useTargetWords } from './app/useTargetWords'
import { useReadingStats } from './app/useReadingStats'
import { useGlobalShortcuts } from './app/useGlobalShortcuts'

interface EditorHostProps {
    bookId: string;
    user: { id: string; name: string; color: string; role: string };
    bookTitle?: string;
}

function EditorHostInner({ bookId, user: userProp }: EditorHostProps) {
  const room = bookId
  const collab = useMemo(() => createCollab(room), [room])
  const toast = useToast()

  const [user, setUser] = useState<User>(() => ({
    id: userProp.id,
    name: userProp.name,
    color: userProp.color,
    role: userProp.role as User['role'],
  }))
  const [suggestingMode, setSuggestingMode] = useState(false)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
  const [pendingNew, setPendingNew] = useState<{ id: string; quote: string } | null>(null)
  const [rightTab, setRightTab] = useState<RightTab>('comments')
  const [leftTab, setLeftTab] = useState<LeftTab>('outline')
  const [findOpen, setFindOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const glossaryEntries = useGlossary(collab.doc)
  const peers = usePeers(collab.provider)
  const connStatus = useConnectionStatus(collab.provider)
  const [title, setTitle] = useDocumentTitle(collab.doc)
  const targetWords = useTargetWords(collab.doc)
  const stats = useReadingStats(editor)
  useGlobalShortcuts({ findOpen, shortcutsOpen, setFindOpen, setShortcutsOpen })

  // Author/proofreader roles are locked into Suggesting mode by policy
  const proofreaderForced = user.role === 'proofreader' || user.role === 'author'
  const effectiveSuggesting = suggestingMode || proofreaderForced
  useEffect(() => {
    if (proofreaderForced && !suggestingMode) setSuggestingMode(true)
  }, [proofreaderForced, suggestingMode])

  // Re-decorate glossary highlights when entries change
  useEffect(() => {
    if (!editor) return
    editor.view.dispatch(editor.state.tr.setMeta('glossaryHighlight/refresh', true))
  }, [editor, glossaryEntries])

  // Tear down Yjs resources on unmount
  useEffect(() => {
    return () => {
      collab.provider.destroy()
      collab.persistence.destroy()
      collab.doc.destroy()
    }
  }, [collab])

  const charCount = editor?.storage.characterCount?.characters() ?? 0
  const wordCount = editor?.storage.characterCount?.words() ?? 0

  return (
    <div className="app">
      <TopBar
        doc={collab.doc}
        room={room}
        user={user}
        onUserChange={setUser}
        suggestingMode={effectiveSuggesting}
        onSuggestingModeChange={setSuggestingMode}
        title={title}
        onTitleChange={setTitle}
        connStatus={connStatus}
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
              setActiveCommentId(id)
              if (id) setRightTab('comments')
            }}
            onCreateComment={(id, quote) => {
              setPendingNew({ id, quote })
              setRightTab('comments')
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
  )
}

export function EditorHost(props: EditorHostProps) {
  return (
    <ToastProvider>
      <EditorHostInner {...props} />
    </ToastProvider>
  )
}
