import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
import * as Y from 'yjs';
import { MessageSquare, GitPullRequestArrow, PanelRightClose } from 'lucide-react';

import { CommentsSidebar } from '@/editor/comments/CommentsSidebar';
import { SuggestionsSidebar } from '@/editor/suggestions/SuggestionsSidebar';
import type { User } from '@/editor/identity/types';
import type { Peer } from '@/editor/app/usePeers';
import { PaneState } from '@/editor/app/usePaneState';

export type RightTab = 'comments' | 'suggestions'

interface RightPaneProps {
    tab: RightTab
    onTabChange: (t: RightTab) => void
    paneState: PaneState
    onExpand: () => void
    onRail: () => void
    onHide: () => void
    doc: Y.Doc
    editor: Editor | null
    user: User
    peers: Peer[]
    activeCommentId: string | null
    onActiveCommentChange: (id: string | null) => void
    pendingNew: { id: string; quote: string } | null
    onPendingHandled: () => void
}

type RightTabTKey = 'pane.comments' | 'pane.suggestions'

const TABS: { id: RightTab; icon: typeof MessageSquare; labelKey: RightTabTKey }[] = [
    { id: 'comments',    icon: MessageSquare,      labelKey: 'pane.comments' },
    { id: 'suggestions', icon: GitPullRequestArrow, labelKey: 'pane.suggestions' },
];

const TAB_TITLE: Record<RightTab, RightTabTKey> = {
    comments:    'pane.comments',
    suggestions: 'pane.suggestions',
};

export function RightPane({
    tab,
    onTabChange,
    paneState,
    onExpand,
    onRail,
    doc,
    editor,
    user,
    peers,
    activeCommentId,
    onActiveCommentChange,
    pendingNew,
    onPendingHandled,
}: RightPaneProps) {
    const { t } = useTranslation('editor');
    const commentMap = doc.getMap('comments');

    // Auto-collapse to rail when comment count drops to zero.
    // Track previous count to fire only on the 1→0 transition.
    // userExpandedRef prevents re-collapsing once the user explicitly expands.
    const prevCountRef = useRef<number>(commentMap.size);
    const userExpandedRef = useRef(false);

    useEffect(() => {
        if (paneState === PaneState.Expanded) {
            // Mark that the pane is in an explicitly expanded state.
            // We only consider it "user-expanded" if it was already expanded before
            // (i.e., not just initialised). We use prevCountRef as a proxy for
            // "mount vs. interaction" — if comments exist, expanded is intentional.
            if (prevCountRef.current > 0) {
                userExpandedRef.current = true;
            }
        }
    }, [paneState]);

    useEffect(() => {
        const observe = () => {
            const current = commentMap.size;
            const prev = prevCountRef.current;

            if (prev > 0 && current === 0 && !userExpandedRef.current) {
                onRail();
            }
            // Reset user-expanded flag when going from 0 → 1+ so next empty auto-collapses.
            if (prev === 0 && current > 0) {
                userExpandedRef.current = false;
            }

            prevCountRef.current = current;
        };

        // Auto-collapse on mount if already empty and pane is expanded.
        if (commentMap.size === 0 && paneState === PaneState.Expanded && !userExpandedRef.current) {
            onRail();
        }

        commentMap.observe(observe);
        return () => { commentMap.unobserve(observe); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [commentMap, onRail]);
    // Note: paneState intentionally not in deps — we only want mount + map changes.
    // Future: CommentsSidebar filters should hide when count < 5 (inside CommentsSidebar).

    const handleTabClick = (id: RightTab) => {
        onTabChange(id);
        onExpand();
    };

    return (
        <aside className="right-pane">
            <nav className="vrail" aria-label={t('pane.comments')}>
                {TABS.map(({ id, icon: Icon, labelKey }) => (
                    <button
                        key={id}
                        type="button"
                        className={`vrail-btn${tab === id ? ' is-active' : ''}`}
                        onClick={() => handleTabClick(id)}
                        aria-label={t(labelKey)}
                        title={t(labelKey)}
                    >
                        <span className="vrail-btn-icon">
                            <Icon size={16} strokeWidth={1.75} />
                        </span>
                        <span className="vrail-btn-label">{t(labelKey)}</span>
                    </button>
                ))}
            </nav>

            <div className="pane-header">
                <h2 className="pane-title">{t(TAB_TITLE[tab])}</h2>
                <button
                    type="button"
                    className="pane-collapse"
                    onClick={onRail}
                    title={t('pane.collapse')}
                    aria-label={t('pane.collapse')}
                >
                    <PanelRightClose size={15} strokeWidth={1.75} />
                </button>
            </div>

            <div className="pane-body">
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
            </div>
        </aside>
    );
}
