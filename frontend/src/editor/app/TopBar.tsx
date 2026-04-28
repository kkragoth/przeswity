import type { Editor } from '@tiptap/react'
import * as Y from 'yjs'
import { Avatar } from '../shell/Avatar'
import { CommentBell } from '../comments/CommentBell'
import { ExportMenu } from '../io/ExportMenu'
import { ImportMenu } from '../io/ImportMenu'
import { TemplatesMenu } from '../workflow/TemplatesMenu'
import { RoleSwitcher } from '../identity/RoleSwitcher'
import type { User } from '../identity/types'
import { ROLE_PERMISSIONS } from '../identity/types'
import type { ConnectionStatus } from './useConnectionStatus'
import type { Peer } from './usePeers'

interface TopBarProps {
  doc: Y.Doc
  room: string
  user: User
  onUserChange: (u: User) => void
  suggestingMode: boolean
  onSuggestingModeChange: (mode: boolean) => void
  title: string
  onTitleChange: (next: string) => void
  connStatus: ConnectionStatus
  peers: Peer[]
  editor: Editor | null
  onCommentBellClick: () => void
  onShortcutsOpen: () => void
  onToast: (msg: string, kind?: 'info' | 'success' | 'error') => void
}

export function TopBar({
  doc,
  room,
  user,
  onUserChange,
  suggestingMode,
  onSuggestingModeChange,
  title,
  onTitleChange,
  connStatus,
  peers,
  editor,
  onCommentBellClick,
  onShortcutsOpen,
  onToast,
}: TopBarProps) {
  const perms = ROLE_PERMISSIONS[user.role]
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">⌘</span>
        <input
          className="doc-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled document"
          spellCheck={false}
        />
        <span
          className={`conn-pill conn-${connStatus}`}
          title={`Room ${room} — ${connStatus}`}
        >
          <span className="conn-dot" />
          {connStatus}
        </span>
      </div>
      <RoleSwitcher
        user={user}
        onUserChange={onUserChange}
        suggestingMode={suggestingMode}
        onSuggestingModeChange={onSuggestingModeChange}
      />
      <div className="topbar-right">
        <div className="peers" title="Connected users">
          {peers.map((p, i) => (
            <Avatar key={i} name={p.name} color={p.color} size="sm" />
          ))}
        </div>
        <CommentBell doc={doc} room={room} userId={user.id} onClick={onCommentBellClick} />
        <button
          type="button"
          className="tb-btn"
          title="Keyboard shortcuts (⌘/)"
          onClick={onShortcutsOpen}
        >
          ?
        </button>
        {perms.canEdit && <TemplatesMenu editor={editor} onToast={onToast} />}
        {perms.canEdit && <ImportMenu editor={editor} onToast={onToast} />}
        {perms.canExport && <ExportMenu editor={editor} />}
      </div>
    </header>
  )
}
