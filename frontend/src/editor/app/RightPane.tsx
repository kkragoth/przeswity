import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
import * as Y from 'yjs';
import { MessageSquare, GitPullRequestArrow, X } from 'lucide-react';

import { CommentsSidebar } from '@/editor/comments/CommentsSidebar';
import { SuggestionsSidebar } from '@/editor/suggestions/SuggestionsSidebar';
import type { User } from '@/editor/identity/types';
import type { Peer } from '@/editor/app/usePeers';

export type RightTab = 'comments' | 'suggestions'

interface RightPaneProps {
    tab: RightTab
    onTabChange: (t: RightTab) => void
    onExpand: () => void
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
    { id: 'comments',    icon: MessageSquare,       labelKey: 'pane.comments' },
    { id: 'suggestions', icon: GitPullRequestArrow, labelKey: 'pane.suggestions' },
];

export function RightPane({
    tab,
    onTabChange,
    onExpand,
    onHide,
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

    const handleTabClick = (id: RightTab) => {
        onTabChange(id);
        onExpand();
    };

    return (
        <aside className="right-pane">
            <div className="pane-tabs">
                {TABS.map(({ id, icon: Icon, labelKey }) => (
                    <button
                        key={id}
                        type="button"
                        className={`pane-tab${tab === id ? ' is-active' : ''}`}
                        onClick={() => handleTabClick(id)}
                        aria-label={t(labelKey)}
                    >
                        <Icon size={14} strokeWidth={1.75} />
                        <span>{t(labelKey)}</span>
                    </button>
                ))}
                <div className="pane-tabs-spacer" />
                <button
                    type="button"
                    className="pane-tab-close"
                    onClick={onHide}
                    aria-label={t('pane.collapse')}
                    title={t('pane.collapse')}
                >
                    <X size={14} />
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
