import type { Editor } from '@tiptap/react'
import * as Y from 'yjs'
import { OutlineSidebar } from '../outline/OutlineSidebar'
import { VersionsPanel } from '../versions/VersionsPanel'
import { GlossaryPanel } from '../glossary/GlossaryPanel'
import { MetaPanel } from '../meta/MetaPanel'
import type { User } from '../identity/types'

export type LeftTab = 'outline' | 'versions' | 'glossary' | 'meta'

interface LeftPaneProps {
  tab: LeftTab
  onTabChange: (t: LeftTab) => void
  doc: Y.Doc
  user: User
  editor: Editor | null
  onToast: (msg: string, kind?: 'info' | 'success' | 'error') => void
}

export function LeftPane({ tab, onTabChange, doc, user, editor, onToast }: LeftPaneProps) {
  return (
    <aside className="left-pane">
      <div className="tab-bar">
        <button
          type="button"
          className={tab === 'outline' ? 'is-active' : ''}
          onClick={() => onTabChange('outline')}
        >
          Outline
        </button>
        <button
          type="button"
          className={tab === 'versions' ? 'is-active' : ''}
          onClick={() => onTabChange('versions')}
        >
          Versions
        </button>
        <button
          type="button"
          className={tab === 'glossary' ? 'is-active' : ''}
          onClick={() => onTabChange('glossary')}
        >
          Glossary
        </button>
        <button
          type="button"
          className={tab === 'meta' ? 'is-active' : ''}
          onClick={() => onTabChange('meta')}
        >
          Meta
        </button>
      </div>
      {tab === 'outline' && <OutlineSidebar editor={editor} />}
      {tab === 'versions' && (
        <VersionsPanel doc={doc} user={user} editor={editor} onToast={onToast} />
      )}
      {tab === 'glossary' && <GlossaryPanel doc={doc} />}
      {tab === 'meta' && <MetaPanel doc={doc} />}
    </aside>
  )
}
