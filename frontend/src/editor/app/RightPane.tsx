import type { Editor } from '@tiptap/react'
import * as Y from 'yjs'
import { CommentsSidebar } from '../comments/CommentsSidebar'
import { SuggestionsSidebar } from '../suggestions/SuggestionsSidebar'
import type { User } from '../identity/types'
import type { Peer } from './usePeers'

export type RightTab = 'comments' | 'suggestions'

interface RightPaneProps {
  tab: RightTab
  onTabChange: (t: RightTab) => void
  doc: Y.Doc
  editor: Editor | null
  user: User
  peers: Peer[]
  activeCommentId: string | null
  onActiveCommentChange: (id: string | null) => void
  pendingNew: { id: string; quote: string } | null
  onPendingHandled: () => void
}

export function RightPane({
  tab,
  onTabChange,
  doc,
  editor,
  user,
  peers,
  activeCommentId,
  onActiveCommentChange,
  pendingNew,
  onPendingHandled,
}: RightPaneProps) {
  return (
    <aside className="right-pane">
      <div className="tab-bar">
        <button
          type="button"
          className={tab === 'comments' ? 'is-active' : ''}
          onClick={() => onTabChange('comments')}
        >
          Comments
        </button>
        <button
          type="button"
          className={tab === 'suggestions' ? 'is-active' : ''}
          onClick={() => onTabChange('suggestions')}
        >
          Suggestions
        </button>
      </div>
      {tab === 'comments' ? (
        <CommentsSidebar
          doc={doc}
          editor={editor}
          user={user}
          activeCommentId={activeCommentId}
          onActiveCommentChange={onActiveCommentChange}
          pendingNew={pendingNew}
          onPendingHandled={onPendingHandled}
          peers={peers}
        />
      ) : (
        <SuggestionsSidebar editor={editor} user={user} />
      )}
    </aside>
  )
}
