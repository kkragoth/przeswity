# Comments UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the comments sidebar with pill-chip filters, focus-mode dimming, avatar ring, accent quote, smooth grid-row expansion, and an always-visible reply input.

**Architecture:** All changes are confined to `CommentsSidebar.tsx` and `comments.css`. No new components. The focus-mode effect is CSS-only via a `has-active` class on the sidebar wrapper toggled from React state. The expand animation switches from a `maxHeight` inline-style hack to a `grid-template-rows: 0fr → 1fr` CSS transition, which requires wrapping expandable content in a single inner div.

**Tech Stack:** React 18, TypeScript, CSS custom properties (design tokens in `tokens.css`), react-i18next (`useTranslation`), Vite.

---

## Files

| File | Action |
|------|--------|
| `frontend/src/editor/comments/CommentsSidebar.tsx` | Modify |
| `frontend/src/editor/comments/comments.css` | Modify |
| `frontend/src/locales/en/editor.json` | Modify |
| `frontend/src/locales/pl/editor.json` | Modify |
| `frontend/src/locales/ua/editor.json` | Modify |

---

## Task 1: i18n — add new keys and wire up `useTranslation`

**Files:**
- Modify: `frontend/src/locales/en/editor.json`
- Modify: `frontend/src/locales/pl/editor.json`
- Modify: `frontend/src/locales/ua/editor.json`
- Modify: `frontend/src/editor/comments/CommentsSidebar.tsx`

- [ ] **Step 1: Add new keys to English locale**

In `frontend/src/locales/en/editor.json`, inside the `"comments"` object, add:

```json
"comments": {
  "tabs": { ... },
  "addComment": "Add comment",
  "reply": "Reply",
  "edited": "(edited)",
  "resolve": "Resolve",
  "reattach": "Reattach",
  "deleteThread": "Delete thread",
  "filter": {
    "open": "Open",
    "resolved": "Resolved",
    "all": "All",
    "allAuthors": "All authors",
    "allRoles": "All roles"
  },
  "empty": "No comments yet. Select text in the document and click 💬 to add one.",
  "noMatch": "No comments match the current filters.",
  "writeComment": "Write a comment… use @ to mention",
  "editComment": "Edit comment…",
  "editReply": "Edit reply…",
  "writeReply": "Reply… use @ to mention",
  "post": "Post",
  "resolvedBy": "resolved by {{name}}",
  "reopen": "Reopen",
  "deleteConfirm": "Delete this comment thread?",
  "deleteResolvedConfirm": "Delete this resolved thread?",
  "close": "Close thread"
}
```

- [ ] **Step 2: Add new keys to Polish locale**

In `frontend/src/locales/pl/editor.json`, inside `"comments"`:

```json
"filter": {
  "open": "Otwarte",
  "resolved": "Rozwiązane",
  "all": "Wszystkie",
  "allAuthors": "Wszyscy autorzy",
  "allRoles": "Wszystkie role"
},
"empty": "Brak komentarzy. Zaznacz tekst w dokumencie i kliknij 💬, aby dodać.",
"noMatch": "Brak komentarzy pasujących do filtrów.",
"writeComment": "Napisz komentarz… użyj @ aby wspomnieć",
"editComment": "Edytuj komentarz…",
"editReply": "Edytuj odpowiedź…",
"writeReply": "Odpowiedz… użyj @ aby wspomnieć",
"post": "Opublikuj",
"resolvedBy": "rozwiązane przez {{name}}",
"reopen": "Otwórz ponownie",
"deleteConfirm": "Usunąć ten wątek komentarzy?",
"deleteResolvedConfirm": "Usunąć ten rozwiązany wątek?",
"close": "Zamknij wątek"
```

- [ ] **Step 3: Add new keys to Ukrainian locale**

In `frontend/src/locales/ua/editor.json`, inside `"comments"`:

```json
"filter": {
  "open": "Відкриті",
  "resolved": "Вирішені",
  "all": "Всі",
  "allAuthors": "Всі автори",
  "allRoles": "Всі ролі"
},
"empty": "Коментарів немає. Виділіть текст і натисніть 💬, щоб додати.",
"noMatch": "Немає коментарів, що відповідають фільтрам.",
"writeComment": "Напишіть коментар… використовуйте @ для згадки",
"editComment": "Редагувати коментар…",
"editReply": "Редагувати відповідь…",
"writeReply": "Відповісти… використовуйте @ для згадки",
"post": "Опублікувати",
"resolvedBy": "вирішено {{name}}",
"reopen": "Відкрити знову",
"deleteConfirm": "Видалити цей вąток коментарів?",
"deleteResolvedConfirm": "Видалити цей вирішений вąток?",
"close": "Закрити вąток"
```

- [ ] **Step 4: Wire `useTranslation` into `CommentsSidebar` and rename shadowing variables**

At the top of `CommentsSidebar.tsx`, add the import:

```tsx
import { useTranslation } from 'react-i18next';
```

Inside the `CommentsSidebar` component body (after the props destructuring), add:

```tsx
const { t } = useTranslation('editor');
```

Then rename every `const t = map.get(id)` in the handler functions to `const thread = map.get(id)` (and update all usages within those functions):

```tsx
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
```

Also rename the JSX map iterators from `(t) =>` to `(thread) =>` in both the open and resolved thread render sections (search for `open.map((t)` and `resolved.map((t)`), updating all `t.id`, `t.body`, `t.replies`, etc. to `thread.id`, `thread.body`, `thread.replies`, etc.

- [ ] **Step 5: Replace hardcoded strings with `t()` calls**

Replace throughout the JSX render (use exact text to find, these are all inside the return statement):

| Hardcoded | Replace with |
|-----------|-------------|
| `'No comments yet. Select text in the document and click 💬 to add one.'` | `t('comments.empty')` |
| `'No comments match the current filters.'` | `t('comments.noMatch')` |
| `placeholder="Write a comment… use @ to mention"` | `placeholder={t('comments.writeComment')}` |
| `placeholder="Edit comment…"` | `placeholder={t('comments.editComment')}` |
| `placeholder="Edit reply…"` | `placeholder={t('comments.editReply')}` |
| `>Post</button>` | `>{t('comments.post')}</button>` |
| `>Save</button>` (edit save) | `>{t('comments.post')}</button>` |
| `title="Resolve"` | `title={t('comments.resolve')}` |
| `>resolved by {thread.resolvedBy}` | `>{t('comments.resolvedBy', { name: thread.resolvedBy })}` |
| `>Reopen</button>` | `>{t('comments.reopen')}</button>` |
| `'Delete this comment thread?'` | `t('comments.deleteConfirm')` |
| `'Delete this resolved thread?'` | `t('comments.deleteResolvedConfirm')` |

- [ ] **Step 6: Verify TypeScript and locale keys**

```bash
cd /Users/kkragoth/dev/przeswity/frontend && npm run typecheck 2>&1 | tail -20
cd /Users/kkragoth/dev/przeswity/frontend && npm run check-locales 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/editor/comments/CommentsSidebar.tsx \
        frontend/src/locales/en/editor.json \
        frontend/src/locales/pl/editor.json \
        frontend/src/locales/ua/editor.json
git commit -m "feat(comments): wire i18n and rename t→thread iterators"
```

---

## Task 2: Status filter — replace `<select>` with pill chips

**Files:**
- Modify: `frontend/src/editor/comments/comments.css`
- Modify: `frontend/src/editor/comments/CommentsSidebar.tsx`

- [ ] **Step 1: Add chip CSS**

In `comments.css`, replace the `.comment-filters select` block (currently at the bottom of the `/* Comment filters */` section) with:

```css
/* Comment filters */
.comment-filters {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
  padding: 0 2px;
  align-items: center;
}
.filter-chips {
  display: flex;
  gap: 4px;
}
.filter-chip {
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid var(--border);
  background: white;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
  line-height: 1.4;
}
.filter-chip:hover {
  border-color: var(--border-strong);
  color: var(--text);
}
.filter-chip.is-active {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}
.comment-filters select {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 11px;
  background: white;
  min-width: 0;
  color: var(--text-muted);
}
```

- [ ] **Step 2: Replace `<select>` status filter with chips in TSX**

Find the `<div className="comment-filters">` block in the JSX. Replace it with:

```tsx
<div className="comment-filters">
    <div className="filter-chips">
        {(['open', 'resolved', 'all'] as StatusFilter[]).map((s) => {
            const labels: Record<StatusFilter, string> = {
                open: `${t('comments.filter.open')} · ${totalOpen}`,
                resolved: t('comments.filter.resolved'),
                all: t('comments.filter.all'),
            };
            return (
                <button
                    key={s}
                    type="button"
                    className={`filter-chip${statusFilter === s ? ' is-active' : ''}`}
                    onClick={() => setStatusFilter(s)}
                >
                    {labels[s]}
                </button>
            );
        })}
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
            <option key={r} value={r}>{t(`roles.${r}`)}</option>
        ))}
    </select>
</div>
```

- [ ] **Step 3: Typecheck**

```bash
cd /Users/kkragoth/dev/przeswity/frontend && npm run typecheck 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/editor/comments/CommentsSidebar.tsx \
        frontend/src/editor/comments/comments.css
git commit -m "feat(comments): replace status select with pill chips"
```

---

## Task 3: Focus mode — dim inactive threads + close button

**Files:**
- Modify: `frontend/src/editor/comments/comments.css`
- Modify: `frontend/src/editor/comments/CommentsSidebar.tsx`

- [ ] **Step 1: Add focus-mode CSS**

In `comments.css`, after the `.thread.is-resolved` rule, add:

```css
/* Focus mode — dim inactive threads when one is active */
.comments-sidebar.has-active .thread:not(.is-active) {
  opacity: 0.45;
  transition: opacity 0.2s ease;
}
.comments-sidebar.has-active .thread:not(.is-active):hover {
  opacity: 0.75;
}

/* Close button on active thread */
.thread-close-btn {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--text-subtle);
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s, background 0.12s;
  padding: 0;
}
.thread.is-active .thread-close-btn {
  opacity: 1;
}
.thread-close-btn:hover {
  background: var(--bg-tint);
  color: var(--text);
}
```

- [ ] **Step 2: Add `has-active` class to sidebar wrapper**

In `CommentsSidebar.tsx`, find the outermost `<div className="sidebar comments-sidebar">` and make the class dynamic:

```tsx
<div className={`sidebar comments-sidebar${activeCommentId ? ' has-active' : ''}`}>
```

- [ ] **Step 3: Add close button to `thread-head-aside`**

Inside the open threads map, find `<div className="thread-head-aside">` and add the close button after the existing resolve button:

```tsx
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
```

- [ ] **Step 4: Typecheck**

```bash
cd /Users/kkragoth/dev/przeswity/frontend && npm run typecheck 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/editor/comments/CommentsSidebar.tsx \
        frontend/src/editor/comments/comments.css
git commit -m "feat(comments): focus mode dimming and close button"
```

---

## Task 4: Active thread visual upgrades — avatar ring, quote accent, resolve button

**Files:**
- Modify: `frontend/src/editor/comments/comments.css`
- Modify: `frontend/src/editor/comments/CommentsSidebar.tsx`

- [ ] **Step 1: Add avatar ring and quote accent CSS**

In `comments.css`, after `.thread.is-active { ... }`, add:

```css
/* Avatar ring when thread is active */
.thread.is-active .avatar-ring {
  box-shadow: 0 0 0 2px white, 0 0 0 3.5px var(--accent);
}

/* Quote accent when thread is active */
.thread.is-active .thread-quote {
  background: linear-gradient(to right, var(--accent-soft), var(--bg-tint));
  border-left-color: var(--accent);
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
}
```

Note: `avatar-ring` is a modifier class added alongside the existing avatar classes. Check how `Avatar` renders — if it already outputs a classname you can target, use that instead (see Step 2).

- [ ] **Step 2: Check `Avatar` component rendering**

Read `frontend/src/editor/shell/Avatar.tsx` to confirm the DOM class it produces. If `Avatar` with `ring={true}` already applies a CSS class like `.avatar-ring`, the CSS from Step 1 is correct as-is. If it uses a different approach (e.g., inline style), add a wrapper `<div className={isActive ? 'avatar-ring' : ''}><Avatar .../></div>` in `CommentsSidebar.tsx` and target `.thread.is-active .avatar-ring .avatar` in CSS instead.

- [ ] **Step 3: Upgrade resolve button to labeled style**

In `comments.css`, add:

```css
.btn-resolve {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--accent);
  background: white;
  color: var(--accent);
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s;
  line-height: 1.4;
}
.btn-resolve:hover {
  background: var(--accent-soft);
}
```

In `CommentsSidebar.tsx`, in the `thread-head-aside` block, change the resolve button from `thread-icon-btn` to `btn-resolve` with text:

```tsx
{perms.canResolveComment && isActive && (
    <button
        type="button"
        className="btn-resolve"
        onClick={(e) => {
            e.stopPropagation();
            resolve(thread.id);
        }}
    >
        ✓ {t('comments.resolve')}
    </button>
)}
```

- [ ] **Step 4: Typecheck**

```bash
cd /Users/kkragoth/dev/przeswity/frontend && npm run typecheck 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/editor/comments/CommentsSidebar.tsx \
        frontend/src/editor/comments/comments.css
git commit -m "feat(comments): avatar ring, quote accent, labeled resolve button"
```

---

## Task 5: Smooth expand animation — replace `maxHeight` with CSS grid rows

**Files:**
- Modify: `frontend/src/editor/comments/comments.css`
- Modify: `frontend/src/editor/comments/CommentsSidebar.tsx`

- [ ] **Step 1: Replace `.thread-expandable` CSS**

In `comments.css`, find the `.thread-expandable` rule and replace it entirely:

```css
/* Before (remove): */
.thread-expandable {
  overflow: hidden;
  transition: max-height 0.25s ease, opacity 0.2s ease;
}

/* After (replace with): */
.thread-expandable {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition:
    grid-template-rows 0.25s cubic-bezier(0.22, 0.61, 0.36, 1),
    opacity 0.2s ease;
}
.thread.is-active .thread-expandable {
  grid-template-rows: 1fr;
  opacity: 1;
}
.thread-expandable-inner {
  min-height: 0;
  overflow: hidden;
}
```

- [ ] **Step 2: Remove inline styles and add inner wrapper in TSX**

In `CommentsSidebar.tsx`, find the expandable div (currently at ~line 389):

```tsx
<div
    className="thread-expandable"
    style={{
        maxHeight: isExpanded ? 1600 : 0,
        opacity: isExpanded ? 1 : 0,
    }}
>
    {/* ... all the expandable content ... */}
</div>
```

Replace with (remove the `style` prop, add inner wrapper):

```tsx
<div className="thread-expandable">
    <div className="thread-expandable-inner">
        {/* ... all the expandable content unchanged ... */}
    </div>
</div>
```

Move all the existing content (thread-body, Reactions, replies, reply draft) inside `thread-expandable-inner` unchanged.

- [ ] **Step 3: Typecheck**

```bash
cd /Users/kkragoth/dev/przeswity/frontend && npm run typecheck 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/editor/comments/CommentsSidebar.tsx \
        frontend/src/editor/comments/comments.css
git commit -m "feat(comments): grid-row expand animation, remove maxHeight hack"
```

---

## Task 6: Always-visible reply input — remove `openReply` state

**Files:**
- Modify: `frontend/src/editor/comments/CommentsSidebar.tsx`
- Modify: `frontend/src/editor/comments/comments.css`

- [ ] **Step 1: Delete `openReply` state and `showReplyBox`**

Remove these two lines from `CommentsSidebar`:

```tsx
// DELETE this line (~line 63):
const [openReply, setOpenReply] = useState<Record<string, boolean>>({});

// DELETE this line (~line 304, inside open.map):
const showReplyBox = openReply[t.id] || isActive;
```

In `submitReply`, remove the `setOpenReply` call (already removed in Task 1 Step 4 if done in sequence; verify it's gone):

```tsx
// This line should not exist after Task 1:
setOpenReply((m) => ({ ...m, [id]: false }));
```

- [ ] **Step 2: Add reply compose CSS**

In `comments.css`, after `.thread-draft { ... }`, add:

```css
.thread-reply-compose {
  margin-top: 8px;
  border-top: 1px solid var(--border);
  padding-top: 8px;
}
.thread-compose-row {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}
.thread-compose-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}
.btn-send {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: var(--accent);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s;
}
.btn-send:hover {
  background: var(--accent-hover);
}
.btn-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

- [ ] **Step 3: Replace reply box JSX**

Inside `thread-expandable-inner` (added in Task 5), find the block that currently reads:

```tsx
{perms.canComment && thread.body && showReplyBox && (
    <div className="thread-draft">
        <MentionTextarea
            value={replyDrafts[thread.id] ?? ''}
            onChange={(v) => setReplyDrafts((m) => ({ ...m, [thread.id]: v }))}
            placeholder="Reply… use @ to mention"
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
                title="Delete thread"
                onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Delete this comment thread?')) remove(thread.id);
                }}
            >
                🗑
            </button>
        </div>
    </div>
)}
```

Replace it with:

```tsx
{perms.canComment && thread.body && isActive && (
    <div className="thread-reply-compose">
        <div className="thread-compose-row">
            <MentionTextarea
                value={replyDrafts[thread.id] ?? ''}
                onChange={(v) => setReplyDrafts((m) => ({ ...m, [thread.id]: v }))}
                placeholder={t('comments.writeReply')}
                candidates={candidates}
                onClick={(e) => e.stopPropagation()}
            />
            <button
                type="button"
                className="btn-send"
                disabled={!(replyDrafts[thread.id] ?? '').trim()}
                title={t('comments.reply')}
                onClick={(e) => {
                    e.stopPropagation();
                    submitReply(thread.id);
                }}
            >
                ↑
            </button>
        </div>
        <div className="thread-compose-footer">
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
```

- [ ] **Step 4: Typecheck + lint**

```bash
cd /Users/kkragoth/dev/przeswity/frontend && npm run typecheck 2>&1 | tail -10
cd /Users/kkragoth/dev/przeswity/frontend && npm run lint -- --quiet 2>&1 | tail -15
```

Expected: no errors. If lint flags `openReply` as unused, it's already deleted — confirm the deletion was complete.

- [ ] **Step 5: Visual smoke test**

Start the dev server and verify:

```bash
cd /Users/kkragoth/dev/przeswity && npm run dev --prefix frontend
```

Open a document, create 2-3 comment threads, and verify:
1. Filter shows pill chips — active chip is oxblood-filled
2. Clicking a thread expands it smoothly (grid animation, not a jump)
3. Inactive threads dim to ~45% opacity
4. Active thread has an oxblood avatar ring
5. Active thread quote shows accent gradient
6. `✓ Resolve` labeled button appears in the thread header
7. Reply textarea is always visible when thread is expanded (no "Reply" button gate)
8. Send button (`↑`) submits the reply
9. Close `✕` button collapses the thread and clears focus mode

- [ ] **Step 6: Commit**

```bash
git add frontend/src/editor/comments/CommentsSidebar.tsx \
        frontend/src/editor/comments/comments.css
git commit -m "feat(comments): always-visible reply input, remove openReply state"
```
