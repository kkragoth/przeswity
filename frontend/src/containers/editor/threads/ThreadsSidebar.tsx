import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { Editor } from '@tiptap/react';

import { CommentThreadCard } from '@/containers/editor/comments/components/CommentThreadCard';
import { CommentsViewProvider } from '@/containers/editor/comments/components/CommentsViewContext';
import { useCommentsStore } from '@/containers/editor/comments/store/CommentsStoreProvider';
import { buildCandidates } from '@/editor/comments/mentionCandidates';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useEditorLive } from '@/containers/editor/session/LiveProvider';
import { useBookContext } from '@/hooks/api/useBookContext';
import { usePaneStore } from '@/containers/editor/session/paneStore';
import { useSession } from '@/containers/editor/SessionStoreProvider';
import { useToast } from '@/editor/shell/useToast';
import { useConfirmDialog } from '@/components/feedback/useConfirmDialog';
import { ConfirmDialogHost } from '@/components/feedback/ConfirmDialogHost';
import { acceptSuggestion, rejectSuggestion } from '@/editor/suggestions/suggestionOps';
import { CommentStatus } from '@/editor/comments/types';
import { formatRelativeTime } from '@/lib/dates';
import {
    ThreadKind,
    ThreadStatusFilter,
    ThreadTypeFilter,
    ThreadSort,
    type UnifiedThread,
} from './types';
import { ThreadsFilterBar } from './ThreadsFilterBar';
import { ThreadsBulkBar } from './ThreadsBulkBar';
import { ThreadsGroup } from './ThreadsGroup';
import { SuggestionThreadCard } from './SuggestionThreadCard';
import { useUnifiedThreads, uniqueAuthors } from './useUnifiedThreads';

interface ThreadsSidebarProps {
    editor: Editor | null;
}

interface UnifiedThreadItemProps {
    thread: UnifiedThread;
    activeId: string | null;
    onActivate: (id: string | null) => void;
}

const UnifiedThreadItem = memo(function UnifiedThreadItem({
    thread,
    activeId,
    onActivate,
}: UnifiedThreadItemProps) {
    if (thread.kind === ThreadKind.Comment) {
        return (
            <div data-thread-id={thread.thread.id}>
                <CommentThreadCard threadId={thread.thread.id} />
            </div>
        );
    }
    const id = thread.entry.suggestionId;
    return (
        <SuggestionThreadCard
            entry={thread.entry}
            isActive={activeId === id}
            onSelect={() => onActivate(activeId === id ? null : id)}
        />
    );
});

const SECTION_GROUPING_THRESHOLD = 8;

export function ThreadsSidebar({ editor }: ThreadsSidebarProps) {
    const { t, i18n } = useTranslation('editor');
    const { user, collab, perms, bookId } = useEditorSession();
    const peers = useEditorLive((s) => s.peers);
    const { assignments } = useBookContext(bookId);
    const hidePane = usePaneStore((s) => s.hide);
    const commentsStore = useCommentsStore();
    const pendingNewComment = useSession((s) => s.pendingNewComment);
    const consumePendingComment = useSession((s) => s.consumePendingComment);
    const setActiveComment = useSession((s) => s.setActiveComment);
    const activeCommentId = useSession((s) => s.activeCommentId);
    const { showWithUndo } = useToast();
    const confirmDlg = useConfirmDialog();

    const [status, setStatus] = useState<ThreadStatusFilter>(ThreadStatusFilter.Open);
    const [typeFilter, setTypeFilter] = useState<ThreadTypeFilter>(ThreadTypeFilter.All);
    const [onlyMine, setOnlyMine] = useState(false);
    const [sort, setSort] = useState<ThreadSort>(ThreadSort.Position);
    const [authorFilter, setAuthorFilter] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const hasActive = activeCommentId !== null || activeId !== null;

    const query = useMemo(
        () => ({ status, type: typeFilter, onlyMine, sort, authorId: authorFilter }),
        [status, typeFilter, onlyMine, sort, authorFilter],
    );
    const result = useUnifiedThreads(editor, collab.doc, query, user);
    const { threads, counts, sectionFor } = result;

    useEffect(() => {
        if (!pendingNewComment) return;
        const consumed = consumePendingComment();
        if (!consumed) return;
        commentsStore.getState().createThread(consumed, '');
        setActiveComment(consumed.id);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const ta = document.querySelector<HTMLTextAreaElement>(
                `[data-thread-id="${CSS.escape(consumed.id)}"] .thread-draft textarea`,
            );
            ta?.focus();
        }));
    }, [pendingNewComment, commentsStore, consumePendingComment, setActiveComment]);

    useEffect(() => {
        if (!activeCommentId) return;
        const el = document.querySelector(`[data-thread-id="${CSS.escape(activeCommentId)}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [activeCommentId]);

    const candidates = useMemo(
        () => buildCandidates({
            peers,
            assignees: assignments.map((a) => ({ name: a.user.name })),
            selfName: user.name,
        }),
        [peers, assignments, user.name],
    );
    const formatRelative = useMemo(
        () => (ts: number) => formatRelativeTime(ts, i18n.language, t),
        [i18n.language, t],
    );
    const viewValue = useMemo(
        () => ({ candidates, formatRelative, editor }),
        [candidates, formatRelative, editor],
    );

    const handleHidePane = useCallback(() => hidePane('right'), [hidePane]);
    const authors = useMemo(() => uniqueAuthors(threads), [threads]);

    const handleResolveAll = useCallback(async () => {
        const ok = await confirmDlg.confirm({
            title: t('threads.bulk.resolveAllConfirm', { count: threads.length }),
        });
        if (!ok) return;
        const store = commentsStore.getState();
        const reopenIds: string[] = [];
        for (const th of threads) {
            if (th.kind !== ThreadKind.Comment) continue;
            if (th.thread.status === CommentStatus.Resolved) continue;
            store.resolveThread(th.thread.id);
            reopenIds.push(th.thread.id);
        }
        if (reopenIds.length === 0) return;
        showWithUndo(
            t('threads.bulk.resolvedToast', { count: reopenIds.length }),
            {
                label: t('comments.undo'),
                onUndo: () => reopenIds.forEach((id) => store.reopenThread(id)),
            },
        );
    }, [confirmDlg, threads, commentsStore, showWithUndo, t]);

    const handleAcceptAll = useCallback(async () => {
        if (!editor || !perms.canResolveSuggestion) return;
        const ok = await confirmDlg.confirm({
            title: t('threads.bulk.acceptAllConfirm', { count: threads.length }),
        });
        if (!ok) return;
        let n = 0;
        for (const th of threads) {
            if (th.kind !== ThreadKind.Suggestion) continue;
            acceptSuggestion(editor, th.entry.suggestionId);
            n++;
        }
        if (n > 0) {
            showWithUndo(t('suggestions.acceptedAllToast', { count: n }), {
                label: t('suggestions.undo'),
                onUndo: () => editor.commands.undo(),
            });
        }
    }, [editor, perms.canResolveSuggestion, confirmDlg, threads, showWithUndo, t]);

    const handleRejectAll = useCallback(async () => {
        if (!editor || !perms.canResolveSuggestion) return;
        const ok = await confirmDlg.confirm({
            title: t('threads.bulk.rejectAllConfirm', { count: threads.length }),
        });
        if (!ok) return;
        let n = 0;
        for (const th of threads) {
            if (th.kind !== ThreadKind.Suggestion) continue;
            rejectSuggestion(editor, th.entry.suggestionId);
            n++;
        }
        if (n > 0) {
            showWithUndo(t('suggestions.rejectedAllToast', { count: n }), {
                label: t('suggestions.undo'),
                onUndo: () => editor.commands.undo(),
            });
        }
    }, [editor, perms.canResolveSuggestion, confirmDlg, threads, showWithUndo, t]);

    const scrollToPos = useCallback((pos: number) => {
        if (!editor) return;
        editor.chain().focus().setTextSelection({ from: pos + 1, to: pos + 1 }).run();
    }, [editor]);

    // Group only when sorting by position and there are enough threads to benefit.
    const useGrouping = sort === ThreadSort.Position && threads.length >= SECTION_GROUPING_THRESHOLD;

    const groupedThreads = useMemo(() => {
        if (!useGrouping) return null;
        const groups: { key: string; title: string; pos: number; items: UnifiedThread[] }[] = [];
        const indexByKey = new Map<string, number>();
        for (const th of threads) {
            const section = sectionFor(th.docPos);
            const key = section ? `s-${section.pos}` : '__top__';
            const title = section ? (section.title || t('threads.section.untitled')) : t('threads.section.beforeFirstHeading');
            const pos = section ? section.pos : 0;
            let idx = indexByKey.get(key);
            if (idx === undefined) {
                idx = groups.length;
                indexByKey.set(key, idx);
                groups.push({ key, title, pos, items: [] });
            }
            groups[idx].items.push(th);
        }
        return groups;
    }, [useGrouping, threads, sectionFor, t]);

    const renderItem = (th: UnifiedThread) => (
        <UnifiedThreadItem
            key={th.kind === ThreadKind.Comment ? th.thread.id : th.entry.suggestionId}
            thread={th}
            activeId={activeId}
            onActivate={setActiveId}
        />
    );

    return (
        <CommentsViewProvider value={viewValue}>
            <div className={`sidebar threads-sidebar${hasActive ? ' has-active' : ''}`}>
                <div className="pane-tabs" style={{ borderBottom: 'none' }}>
                    <span className="pane-tab is-active" style={{ pointerEvents: 'none' }}>
                        {t('threads.title')}
                        {counts.total > 0 ? ` (${counts.total})` : ''}
                    </span>
                    <div className="pane-tabs-spacer" />
                    <button
                        type="button"
                        className="pane-tab-close"
                        onClick={handleHidePane}
                        aria-label={t('pane.collapse')}
                    >
                        <X size={14} />
                    </button>
                </div>

                <ThreadsFilterBar
                    status={status}
                    type={typeFilter}
                    onlyMine={onlyMine}
                    sort={sort}
                    counts={counts}
                    onStatusChange={setStatus}
                    onTypeChange={setTypeFilter}
                    onMineChange={setOnlyMine}
                    onSortChange={setSort}
                />

                <ThreadsBulkBar
                    visibleCount={threads.length}
                    canBulkResolve={perms.canResolveComment && status !== ThreadStatusFilter.Resolved && typeFilter !== ThreadTypeFilter.Suggestions}
                    canBulkAcceptReject={perms.canResolveSuggestion && typeFilter !== ThreadTypeFilter.Comments && status !== ThreadStatusFilter.Resolved}
                    authors={authors}
                    activeAuthorId={authorFilter}
                    onAuthorChange={setAuthorFilter}
                    onResolveAll={handleResolveAll}
                    onAcceptAll={handleAcceptAll}
                    onRejectAll={handleRejectAll}
                />

                {threads.length === 0 ? (
                    <div className="sidebar-empty">{t('threads.empty')}</div>
                ) : (
                    <div className="threads-list">
                        {groupedThreads
                            ? groupedThreads.map((g) => (
                                <ThreadsGroup
                                    key={g.key}
                                    title={g.title}
                                    count={g.items.length}
                                    onHeaderInteract={() => {
                                        setActiveComment(null);
                                        setActiveId(null);
                                    }}
                                    onLocate={g.pos > 0 ? () => scrollToPos(g.pos) : undefined}
                                >
                                    {g.items.map(renderItem)}
                                </ThreadsGroup>
                            ))
                            : threads.map(renderItem)}
                    </div>
                )}
                <ConfirmDialogHost
                    dialogState={confirmDlg.dialogState}
                    onConfirm={confirmDlg.onConfirm}
                    onCancel={confirmDlg.onCancel}
                />
            </div>
        </CommentsViewProvider>
    );
}
