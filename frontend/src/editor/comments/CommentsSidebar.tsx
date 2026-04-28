import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
import * as Y from 'yjs';
import type { CommentThread } from './types';
import type { Role, User } from '../identity/types';
import { ROLE_PERMISSIONS } from '../identity/types';
import {
    MentionTextarea,
    buildCandidates,
    renderBodyWithMentions,
} from './MentionTextarea';
import { Avatar } from '../shell/Avatar';
import { Reactions } from './Reactions';
import { useThreads } from './useThreads';
import { getThreadMap } from './threadOps';
import { authorColor } from './color';

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
    return Math.random().toString(36).slice(2, 11);
}

function formatTime(ts: number): string {
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'just now';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    return new Date(ts).toLocaleDateString();
}

function previewBody(body: string, max = 90): string {
    const single = body.replace(/\s+/g, ' ').trim();
    if (single.length <= max) return single;
    return single.slice(0, max - 1) + '…';
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
    const { t } = useTranslation('editor');
    const threads = useThreads(doc);
    const map = getThreadMap(doc);
    const [draft, setDraft] = useState('');
    const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
    const [openReply, setOpenReply] = useState<Record<string, boolean>>({});
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
    const [authorFilter, setAuthorFilter] = useState<string>('');
    const [roleFilter, setRoleFilter] = useState<Role | ''>('');
    const cardsRef = useRef<Record<string, HTMLDivElement | null>>({});
    const [editingThread, setEditingThread] = useState<string | null>(null);
    const [editingReply, setEditingReply] = useState<{ threadId: string; replyId: string } | null>(null);
    const [editBuffer, setEditBuffer] = useState('');

    const perms = ROLE_PERMISSIONS[user.role];
    const candidates = useMemo(() => buildCandidates(peers, user.name), [peers, user.name]);

    useEffect(() => {
        if (!pendingNew) return;
        const newThread: CommentThread = {
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
        };
        map.set(pendingNew.id, newThread);
        onActiveCommentChange(pendingNew.id);
        onPendingHandled();
    }, [pendingNew, map, user, onActiveCommentChange, onPendingHandled]);

    useEffect(() => {
        if (!activeCommentId) return;
        const el = cardsRef.current[activeCommentId];
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [activeCommentId]);

    const submitDraft = (id: string) => {
        const text = draft.trim();
        if (!text) return;
        const thread = map.get(id);
        if (!thread) return;
        map.set(id, { ...thread, body: text });
        setDraft('');
    };

    const submitReply = (id: string) => {
        const text = (replyDrafts[id] ?? '').trim();
        if (!text) return;
        const thread = map.get(id);
        if (!thread) return;
        map.set(id, {
            ...thread,
            replies: [
                ...thread.replies,
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
        });
        setReplyDrafts((m) => ({ ...m, [id]: '' }));
    };

    const resolve = (id: string) => {
        const thread = map.get(id);
        if (!thread) return;
        map.set(id, {
            ...thread,
            status: 'resolved',
            resolvedBy: user.name,
            resolvedAt: Date.now(),
        });
        if (editor) editor.chain().focus().unsetComment(id).run();
    };

    const reopen = (id: string) => {
        const thread = map.get(id);
        if (!thread) return;
        map.set(id, { ...thread, status: 'open', resolvedBy: undefined, resolvedAt: undefined });
    };

    const remove = (id: string) => {
        map.delete(id);
        if (editor) editor.chain().focus().unsetComment(id).run();
    };

    const toggleReactionOnThread = (id: string, emoji: string) => {
        const thread = map.get(id);
        if (!thread) return;
        const next = { ...(thread.reactions ?? {}) };
        const ids = new Set(next[emoji] ?? []);
        if (ids.has(user.id)) ids.delete(user.id);
        else ids.add(user.id);
        if (ids.size === 0) delete next[emoji];
        else next[emoji] = [...ids];
        map.set(id, { ...thread, reactions: next });
    };

    const toggleReactionOnReply = (threadId: string, replyId: string, emoji: string) => {
        const thread = map.get(threadId);
        if (!thread) return;
        const replies = thread.replies.map((rep) => {
            if (rep.id !== replyId) return rep;
            const next = { ...(rep.reactions ?? {}) };
            const ids = new Set(next[emoji] ?? []);
            if (ids.has(user.id)) ids.delete(user.id);
            else ids.add(user.id);
            if (ids.size === 0) delete next[emoji];
            else next[emoji] = [...ids];
            return { ...rep, reactions: next };
        });
        map.set(threadId, { ...thread, replies });
    };

    const startEditThread = (id: string, body: string) => {
        setEditingThread(id);
        setEditingReply(null);
        setEditBuffer(body);
    };

    const startEditReply = (threadId: string, replyId: string, body: string) => {
        setEditingThread(null);
        setEditingReply({ threadId, replyId });
        setEditBuffer(body);
    };

    const saveEdit = () => {
        const text = editBuffer.trim();
        if (!text) return;
        if (editingThread) {
            const thread = map.get(editingThread);
            if (thread) map.set(editingThread, { ...thread, body: text, edited: Date.now() });
        } else if (editingReply) {
            const thread = map.get(editingReply.threadId);
            if (thread) {
                const replies = thread.replies.map((rep) =>
                    rep.id === editingReply.replyId ? { ...rep, body: text, edited: Date.now() } : rep,
                );
                map.set(editingReply.threadId, { ...thread, replies });
            }
        }
        setEditingThread(null);
        setEditingReply(null);
        setEditBuffer('');
    };

    const cancelEdit = () => {
        setEditingThread(null);
        setEditingReply(null);
        setEditBuffer('');
    };

    const allAuthors = useMemo(() => {
        const set = new Set<string>();
        for (const thread of threads) {
            set.add(thread.authorName);
            for (const r of thread.replies) set.add(r.authorName);
        }
        return [...set].sort();
    }, [threads]);

    const matchesFilters = (thread: CommentThread) => {
        if (statusFilter !== 'all' && thread.status !== statusFilter) return false;
        if (authorFilter) {
            const has =
        thread.authorName === authorFilter ||
        thread.replies.some((r) => r.authorName === authorFilter);
            if (!has) return false;
        }
        if (roleFilter) {
            const hasRole =
        thread.authorRole === roleFilter ||
        thread.replies.some((r) => r.authorRole === roleFilter);
            if (!hasRole) return false;
        }
        return true;
    };

    const filtered = threads.filter(matchesFilters);
    const open = filtered.filter((thread) => thread.status === 'open');
    const resolved = filtered.filter((thread) => thread.status === 'resolved');
    const totalOpen = threads.filter((thread) => thread.status === 'open').length;

    return (
        <div className={`sidebar comments-sidebar${activeCommentId ? ' has-active' : ''}`}>
            <div className="comments-header">
                <span className="sidebar-title sidebar-title-inline">
          Comments <span className="comment-count-pill">{totalOpen}</span>
                </span>
            </div>
            <div className="comment-filters">
                <div className="filter-chips">
                    {(() => {
                        const chipLabels: Record<StatusFilter, string> = {
                            open: `${t('comments.filter.open')} · ${totalOpen}`,
                            resolved: t('comments.filter.resolved'),
                            all: t('comments.filter.all'),
                        };
                        return (['open', 'resolved', 'all'] as StatusFilter[]).map((s) => (
                            <button
                                key={s}
                                type="button"
                                aria-pressed={statusFilter === s}
                                className={`filter-chip${statusFilter === s ? ' is-active' : ''}`}
                                onClick={() => setStatusFilter(s)}
                            >
                                {chipLabels[s]}
                            </button>
                        ));
                    })()}
                </div>
                <select value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)}>
                    <option value="">{t('comments.filter.allAuthors')}</option>
                    {allAuthors.map((a) => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </select>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as Role | '')}
                >
                    <option value="">{t('comments.filter.allRoles')}</option>
                    {(['translator', 'author', 'editor', 'proofreader', 'coordinator'] as Role[]).map((r) => (
                        <option key={r} value={r}>{t(`roles.${r}`, { defaultValue: r })}</option>
                    ))}
                </select>
            </div>
            {filtered.length === 0 && (
                <div className="sidebar-empty">
                    {threads.length === 0
                        ? t('comments.empty')
                        : t('comments.noMatch')}
                </div>
            )}
            {(statusFilter === 'all' || statusFilter === 'open') &&
        open.map((thread) => {
            const isActive = activeCommentId === thread.id;
            const isExpanded = isActive;
            const draftEmpty = thread.body === '';
            const showReplyBox = openReply[thread.id] || isActive;
            return (
                <div
                    key={thread.id}
                    ref={(el) => {
                        cardsRef.current[thread.id] = el;
                    }}
                    className={`thread${isActive ? ' is-active' : ''}${isExpanded ? ' is-expanded' : ''}`}
                    onClick={() => onActiveCommentChange(thread.id)}
                >
                    <div className="thread-head">
                        <Avatar
                            name={thread.authorName}
                            color={authorColor(thread)}
                            size="md"
                            ring={isActive}
                        />
                        <div className="thread-head-text">
                            <div className="thread-head-row">
                                <span className="thread-author">{thread.authorName}</span>
                                <span className="thread-role-chip">{thread.authorRole}</span>
                            </div>
                            <div className="thread-head-time">{formatTime(thread.createdAt)}</div>
                        </div>
                        <div className="thread-head-aside">
                            {thread.replies.length > 0 && !isExpanded && (
                                <span className="thread-reply-count" title={`${thread.replies.length} replies`}>
                      ↳ {thread.replies.length}
                                </span>
                            )}
                            {perms.canResolveComment && isActive && (
                                <button
                                    type="button"
                                    className="thread-icon-btn"
                                    title={t('comments.resolve')}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        resolve(thread.id);
                                    }}
                                >
                      ✓
                                </button>
                            )}
                            {isActive && (
                                <button
                                    type="button"
                                    className="thread-close-btn"
                                    title={t('comments.close')}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onActiveCommentChange(null);
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="thread-quote">"{thread.originalQuote}"</div>
                    {draftEmpty && isActive ? (
                        <div className="thread-draft">
                            <MentionTextarea
                                value={draft}
                                onChange={setDraft}
                                placeholder={t('comments.writeComment')}
                                autoFocus
                                candidates={candidates}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <div className="thread-actions">
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        submitDraft(thread.id);
                                    }}
                                    disabled={!draft.trim()}
                                >
                      {t('comments.post')}
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        remove(thread.id);
                                    }}
                                >
                      Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {thread.body && !isExpanded && (
                                <div className="thread-preview">{previewBody(thread.body)}</div>
                            )}
                            <div
                                className="thread-expandable"
                                style={{
                                    maxHeight: isExpanded ? 1600 : 0,
                                    opacity: isExpanded ? 1 : 0,
                                }}
                            >
                                {thread.body &&
                      (editingThread === thread.id ? (
                          <div className="thread-draft">
                              <MentionTextarea
                                  value={editBuffer}
                                  onChange={setEditBuffer}
                                  placeholder={t('comments.editComment')}
                                  autoFocus
                                  candidates={candidates}
                                  onClick={(e) => e.stopPropagation()}
                              />
                              <div className="thread-actions">
                                  <button
                                      type="button"
                                      className="btn-primary"
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          saveEdit();
                                      }}
                                  >
                              {t('comments.post')}
                                  </button>
                                  <button
                                      type="button"
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          cancelEdit();
                                      }}
                                  >
                              Cancel
                                  </button>
                              </div>
                          </div>
                      ) : (
                          <div className="thread-body">
                              {renderBodyWithMentions(thread.body)}
                              {thread.edited && (
                                  <span className="thread-edited" title={new Date(thread.edited).toLocaleString()}>
                                      {' '}
                              · edited
                                  </span>
                              )}
                              {thread.authorId === user.id && (
                                  <button
                                      type="button"
                                      className="thread-edit-btn"
                                      title="Edit"
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          startEditThread(thread.id, thread.body);
                                      }}
                                  >
                              ✎
                                  </button>
                              )}
                          </div>
                      ))}
                                {isExpanded && thread.body && (
                                    <Reactions
                                        reactions={thread.reactions}
                                        myUserId={user.id}
                                        onToggle={(e) => toggleReactionOnThread(thread.id, e)}
                                    />
                                )}
                                {thread.replies.map((r) => {
                                    const isEditingThis =
                        editingReply?.threadId === thread.id && editingReply.replyId === r.id;
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
                                                            placeholder={t('comments.editReply')}
                                                            autoFocus
                                                            candidates={candidates}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <div className="thread-actions">
                                                            <button
                                                                type="button"
                                                                className="btn-primary"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    saveEdit();
                                                                }}
                                                            >
                                    {t('comments.post')}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    cancelEdit();
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
                                                                    e.stopPropagation();
                                                                    startEditReply(thread.id, r.id, r.body);
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
                                                    onToggle={(e) => toggleReactionOnReply(thread.id, r.id, e)}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                                {perms.canComment && thread.body && showReplyBox && (
                                    <div className="thread-draft">
                                        <MentionTextarea
                                            value={replyDrafts[thread.id] ?? ''}
                                            onChange={(v) => setReplyDrafts((m) => ({ ...m, [thread.id]: v }))}
                                            placeholder={t('comments.writeReply')}
                                            candidates={candidates}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="thread-actions">
                                            <button
                                                type="button"
                                                className="btn-primary"
                                                disabled={!(replyDrafts[thread.id] ?? '').trim()}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    submitReply(thread.id);
                                                }}
                                            >
                            Reply
                                            </button>
                                            {perms.canResolveComment && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        resolve(thread.id);
                                                    }}
                                                >
                              Resolve
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="thread-icon-btn thread-remove"
                                                title={t('comments.deleteThread')}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(t('comments.deleteConfirm'))) remove(thread.id);
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
            );
        })}
            {resolved.length > 0 && statusFilter !== 'open' && (
                <>
                    <div className="sidebar-title sidebar-title-resolved">
            Resolved ({resolved.length})
                    </div>
                    {resolved.map((thread) => (
                        <div key={thread.id} className="thread is-resolved">
                            <div className="thread-head">
                                <Avatar name={thread.authorName} color={authorColor(thread)} size="md" />
                                <div className="thread-head-text">
                                    <div className="thread-head-row">
                                        <span className="thread-author">{thread.authorName}</span>
                                        <span className="thread-role-chip">{thread.authorRole}</span>
                                    </div>
                                    <div className="thread-head-time">
                                        {t('comments.resolvedBy', { name: thread.resolvedBy })}
                                        {thread.resolvedAt ? ` · ${formatTime(thread.resolvedAt)}` : ''}
                                    </div>
                                </div>
                            </div>
                            <div className="thread-quote">"{thread.originalQuote}"</div>
                            {thread.body && <div className="thread-body">{renderBodyWithMentions(thread.body)}</div>}
                            <div className="thread-actions">
                                <button type="button" onClick={() => reopen(thread.id)}>
                  {t('comments.reopen')}
                                </button>
                                <button
                                    type="button"
                                    className="thread-icon-btn thread-remove"
                                    onClick={() => {
                                        if (window.confirm(t('comments.deleteResolvedConfirm'))) remove(thread.id);
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
    );
}
