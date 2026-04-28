import { useEffect, useMemo, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import * as Y from 'yjs'
import type { CommentThread } from './types'
import type { Role, User } from '../identity/types'
import { ROLE_PERMISSIONS } from '../identity/types'
import {
  MentionTextarea,
  buildCandidates,
  renderBodyWithMentions,
} from './MentionTextarea'
import { Avatar } from '../shell/Avatar'
import { Reactions } from './Reactions'
import { useThreads } from './useThreads'
import { getThreadMap } from './threadOps'
import { authorColor } from './color'

interface CommentsSidebarProps {
  doc: Y.Doc
  editor: Editor | null
  user: User
  activeCommentId: string | null
  onActiveCommentChange: (id: string | null) => void
  pendingNew: { id: string; quote: string } | null
  onPendingHandled: () => void
  peers: { name: string; color: string }[]
}

type StatusFilter = 'open' | 'resolved' | 'all'

function makeId() {
  return Math.random().toString(36).slice(2, 11)
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return new Date(ts).toLocaleDateString()
}

function previewBody(body: string, max = 90): string {
  const single = body.replace(/\s+/g, ' ').trim()
  if (single.length <= max) return single
  return single.slice(0, max - 1) + '…'
}

export function CommentsSidebar({
  doc,
  editor,
  user,
  activeCommentId,
  onActiveCommentChange,
  pendingNew,
  onPendingHandled,
  peers,
}: CommentsSidebarProps) {
  const threads = useThreads(doc)
  const map = getThreadMap(doc)
  const [draft, setDraft] = useState('')
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [openReply, setOpenReply] = useState<Record<string, boolean>>({})
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')
  const [authorFilter, setAuthorFilter] = useState<string>('')
  const [roleFilter, setRoleFilter] = useState<Role | ''>('')
  const cardsRef = useRef<Record<string, HTMLDivElement | null>>({})
  const [editingThread, setEditingThread] = useState<string | null>(null)
  const [editingReply, setEditingReply] = useState<{ threadId: string; replyId: string } | null>(null)
  const [editBuffer, setEditBuffer] = useState('')

  const perms = ROLE_PERMISSIONS[user.role]
  const candidates = useMemo(() => buildCandidates(peers, user.name), [peers, user.name])

  useEffect(() => {
    if (!pendingNew) return
    const t: CommentThread = {
      id: pendingNew.id,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      authorColor: user.color,
      targetRole: null,
      body: '',
      originalQuote: pendingNew.quote,
      createdAt: Date.now(),
      status: 'open',
      replies: [],
    }
    map.set(pendingNew.id, t)
    onActiveCommentChange(pendingNew.id)
    onPendingHandled()
  }, [pendingNew, map, user, onActiveCommentChange, onPendingHandled])

  useEffect(() => {
    if (!activeCommentId) return
    const el = cardsRef.current[activeCommentId]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeCommentId])

  const submitDraft = (id: string) => {
    const text = draft.trim()
    if (!text) return
    const t = map.get(id)
    if (!t) return
    map.set(id, { ...t, body: text })
    setDraft('')
  }

  const submitReply = (id: string) => {
    const text = (replyDrafts[id] ?? '').trim()
    if (!text) return
    const t = map.get(id)
    if (!t) return
    map.set(id, {
      ...t,
      replies: [
        ...t.replies,
        {
          id: makeId(),
          authorId: user.id,
          authorName: user.name,
          authorRole: user.role,
          authorColor: user.color,
          body: text,
          createdAt: Date.now(),
        },
      ],
    })
    setReplyDrafts((m) => ({ ...m, [id]: '' }))
    setOpenReply((m) => ({ ...m, [id]: false }))
  }

  const resolve = (id: string) => {
    const t = map.get(id)
    if (!t) return
    map.set(id, {
      ...t,
      status: 'resolved',
      resolvedBy: user.name,
      resolvedAt: Date.now(),
    })
    if (editor) editor.chain().focus().unsetComment(id).run()
  }

  const reopen = (id: string) => {
    const t = map.get(id)
    if (!t) return
    map.set(id, { ...t, status: 'open', resolvedBy: undefined, resolvedAt: undefined })
  }

  const remove = (id: string) => {
    map.delete(id)
    if (editor) editor.chain().focus().unsetComment(id).run()
  }

  const toggleReactionOnThread = (id: string, emoji: string) => {
    const t = map.get(id)
    if (!t) return
    const next = { ...(t.reactions ?? {}) }
    const ids = new Set(next[emoji] ?? [])
    if (ids.has(user.id)) ids.delete(user.id)
    else ids.add(user.id)
    if (ids.size === 0) delete next[emoji]
    else next[emoji] = [...ids]
    map.set(id, { ...t, reactions: next })
  }

  const toggleReactionOnReply = (threadId: string, replyId: string, emoji: string) => {
    const t = map.get(threadId)
    if (!t) return
    const replies = t.replies.map((rep) => {
      if (rep.id !== replyId) return rep
      const next = { ...(rep.reactions ?? {}) }
      const ids = new Set(next[emoji] ?? [])
      if (ids.has(user.id)) ids.delete(user.id)
      else ids.add(user.id)
      if (ids.size === 0) delete next[emoji]
      else next[emoji] = [...ids]
      return { ...rep, reactions: next }
    })
    map.set(threadId, { ...t, replies })
  }

  const startEditThread = (id: string, body: string) => {
    setEditingThread(id)
    setEditingReply(null)
    setEditBuffer(body)
  }

  const startEditReply = (threadId: string, replyId: string, body: string) => {
    setEditingThread(null)
    setEditingReply({ threadId, replyId })
    setEditBuffer(body)
  }

  const saveEdit = () => {
    const text = editBuffer.trim()
    if (!text) return
    if (editingThread) {
      const t = map.get(editingThread)
      if (t) map.set(editingThread, { ...t, body: text, edited: Date.now() })
    } else if (editingReply) {
      const t = map.get(editingReply.threadId)
      if (t) {
        const replies = t.replies.map((rep) =>
          rep.id === editingReply.replyId ? { ...rep, body: text, edited: Date.now() } : rep,
        )
        map.set(editingReply.threadId, { ...t, replies })
      }
    }
    setEditingThread(null)
    setEditingReply(null)
    setEditBuffer('')
  }

  const cancelEdit = () => {
    setEditingThread(null)
    setEditingReply(null)
    setEditBuffer('')
  }

  const allAuthors = useMemo(() => {
    const set = new Set<string>()
    for (const t of threads) {
      set.add(t.authorName)
      for (const r of t.replies) set.add(r.authorName)
    }
    return [...set].sort()
  }, [threads])

  const matchesFilters = (t: CommentThread) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (authorFilter) {
      const has =
        t.authorName === authorFilter ||
        t.replies.some((r) => r.authorName === authorFilter)
      if (!has) return false
    }
    if (roleFilter) {
      const hasRole =
        t.authorRole === roleFilter ||
        t.replies.some((r) => r.authorRole === roleFilter)
      if (!hasRole) return false
    }
    return true
  }

  const filtered = threads.filter(matchesFilters)
  const open = filtered.filter((t) => t.status === 'open')
  const resolved = filtered.filter((t) => t.status === 'resolved')
  const totalOpen = threads.filter((t) => t.status === 'open').length

  return (
    <div className="sidebar comments-sidebar">
      <div className="comments-header">
        <span className="sidebar-title sidebar-title-inline">
          Comments <span className="comment-count-pill">{totalOpen}</span>
        </span>
      </div>
      <div className="comment-filters">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>
        <select value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)}>
          <option value="">All authors</option>
          {allAuthors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | '')}
        >
          <option value="">All roles</option>
          {(['translator', 'author', 'editor', 'proofreader', 'coordinator'] as Role[]).map(
            (r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ),
          )}
        </select>
      </div>
      {filtered.length === 0 && (
        <div className="sidebar-empty">
          {threads.length === 0
            ? 'No comments yet. Select text in the document and click 💬 to add one.'
            : 'No comments match the current filters.'}
        </div>
      )}
      {(statusFilter === 'all' || statusFilter === 'open') &&
        open.map((t) => {
          const isActive = activeCommentId === t.id
          const isExpanded = isActive
          const draftEmpty = t.body === ''
          const showReplyBox = openReply[t.id] || isActive
          return (
            <div
              key={t.id}
              ref={(el) => {
                cardsRef.current[t.id] = el
              }}
              className={`thread${isActive ? ' is-active' : ''}${isExpanded ? ' is-expanded' : ''}`}
              onClick={() => onActiveCommentChange(t.id)}
            >
              <div className="thread-head">
                <Avatar
                  name={t.authorName}
                  color={authorColor(t)}
                  size="md"
                  ring={isActive}
                />
                <div className="thread-head-text">
                  <div className="thread-head-row">
                    <span className="thread-author">{t.authorName}</span>
                    <span className="thread-role-chip">{t.authorRole}</span>
                  </div>
                  <div className="thread-head-time">{formatTime(t.createdAt)}</div>
                </div>
                <div className="thread-head-aside">
                  {t.replies.length > 0 && !isExpanded && (
                    <span className="thread-reply-count" title={`${t.replies.length} replies`}>
                      ↳ {t.replies.length}
                    </span>
                  )}
                  {perms.canResolveComment && isActive && (
                    <button
                      type="button"
                      className="thread-icon-btn"
                      title="Resolve"
                      onClick={(e) => {
                        e.stopPropagation()
                        resolve(t.id)
                      }}
                    >
                      ✓
                    </button>
                  )}
                </div>
              </div>
              <div className="thread-quote">“{t.originalQuote}”</div>
              {draftEmpty && isActive ? (
                <div className="thread-draft">
                  <MentionTextarea
                    value={draft}
                    onChange={setDraft}
                    placeholder="Write a comment… use @ to mention"
                    autoFocus
                    candidates={candidates}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="thread-actions">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={(e) => {
                        e.stopPropagation()
                        submitDraft(t.id)
                      }}
                      disabled={!draft.trim()}
                    >
                      Post
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        remove(t.id)
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {t.body && !isExpanded && (
                    <div className="thread-preview">{previewBody(t.body)}</div>
                  )}
                  <div
                    className="thread-expandable"
                    style={{
                      maxHeight: isExpanded ? 1600 : 0,
                      opacity: isExpanded ? 1 : 0,
                    }}
                  >
                    {t.body &&
                      (editingThread === t.id ? (
                        <div className="thread-draft">
                          <MentionTextarea
                            value={editBuffer}
                            onChange={setEditBuffer}
                            placeholder="Edit comment…"
                            autoFocus
                            candidates={candidates}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="thread-actions">
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={(e) => {
                                e.stopPropagation()
                                saveEdit()
                              }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                cancelEdit()
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="thread-body">
                          {renderBodyWithMentions(t.body)}
                          {t.edited && (
                            <span className="thread-edited" title={new Date(t.edited).toLocaleString()}>
                              {' '}
                              · edited
                            </span>
                          )}
                          {t.authorId === user.id && (
                            <button
                              type="button"
                              className="thread-edit-btn"
                              title="Edit"
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditThread(t.id, t.body)
                              }}
                            >
                              ✎
                            </button>
                          )}
                        </div>
                      ))}
                    {isExpanded && t.body && (
                      <Reactions
                        reactions={t.reactions}
                        myUserId={user.id}
                        onToggle={(e) => toggleReactionOnThread(t.id, e)}
                      />
                    )}
                    {t.replies.map((r) => {
                      const isEditingThis =
                        editingReply?.threadId === t.id && editingReply.replyId === r.id
                      return (
                        <div key={r.id} className="thread-reply">
                          <Avatar name={r.authorName} color={r.authorColor} size="sm" />
                          <div className="thread-reply-text">
                            <div className="thread-head-row">
                              <span className="thread-author">{r.authorName}</span>
                              <span className="thread-role-chip">{r.authorRole}</span>
                              <span className="thread-head-time">{formatTime(r.createdAt)}</span>
                            </div>
                            {isEditingThis ? (
                              <div className="thread-draft">
                                <MentionTextarea
                                  value={editBuffer}
                                  onChange={setEditBuffer}
                                  placeholder="Edit reply…"
                                  autoFocus
                                  candidates={candidates}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="thread-actions">
                                  <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      saveEdit()
                                    }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      cancelEdit()
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="thread-body">
                                {renderBodyWithMentions(r.body)}
                                {r.edited && (
                                  <span className="thread-edited">
                                    {' '}
                                    · edited
                                  </span>
                                )}
                                {r.authorId === user.id && (
                                  <button
                                    type="button"
                                    className="thread-edit-btn"
                                    title="Edit"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      startEditReply(t.id, r.id, r.body)
                                    }}
                                  >
                                    ✎
                                  </button>
                                )}
                              </div>
                            )}
                            <Reactions
                              reactions={r.reactions}
                              myUserId={user.id}
                              onToggle={(e) => toggleReactionOnReply(t.id, r.id, e)}
                            />
                          </div>
                        </div>
                      )
                    })}
                    {perms.canComment && t.body && showReplyBox && (
                      <div className="thread-draft">
                        <MentionTextarea
                          value={replyDrafts[t.id] ?? ''}
                          onChange={(v) => setReplyDrafts((m) => ({ ...m, [t.id]: v }))}
                          placeholder="Reply… use @ to mention"
                          candidates={candidates}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="thread-actions">
                          <button
                            type="button"
                            className="btn-primary"
                            disabled={!(replyDrafts[t.id] ?? '').trim()}
                            onClick={(e) => {
                              e.stopPropagation()
                              submitReply(t.id)
                            }}
                          >
                            Reply
                          </button>
                          {perms.canResolveComment && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                resolve(t.id)
                              }}
                            >
                              Resolve
                            </button>
                          )}
                          <button
                            type="button"
                            className="thread-icon-btn thread-remove"
                            title="Delete thread"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (window.confirm('Delete this comment thread?')) remove(t.id)
                            }}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      {resolved.length > 0 && statusFilter !== 'open' && (
        <>
          <div className="sidebar-title sidebar-title-resolved">
            Resolved ({resolved.length})
          </div>
          {resolved.map((t) => (
            <div key={t.id} className="thread is-resolved">
              <div className="thread-head">
                <Avatar name={t.authorName} color={authorColor(t)} size="md" />
                <div className="thread-head-text">
                  <div className="thread-head-row">
                    <span className="thread-author">{t.authorName}</span>
                    <span className="thread-role-chip">{t.authorRole}</span>
                  </div>
                  <div className="thread-head-time">
                    resolved by {t.resolvedBy}
                    {t.resolvedAt ? ` · ${formatTime(t.resolvedAt)}` : ''}
                  </div>
                </div>
              </div>
              <div className="thread-quote">“{t.originalQuote}”</div>
              {t.body && <div className="thread-body">{renderBodyWithMentions(t.body)}</div>}
              <div className="thread-actions">
                <button type="button" onClick={() => reopen(t.id)}>
                  Reopen
                </button>
                <button
                  type="button"
                  className="thread-icon-btn thread-remove"
                  onClick={() => {
                    if (window.confirm('Delete this resolved thread?')) remove(t.id)
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
