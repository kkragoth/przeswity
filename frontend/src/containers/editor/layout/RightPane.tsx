import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
import { MessageSquare, GitPullRequestArrow, X } from 'lucide-react';

import { CommentsSidebar } from '@/containers/editor/comments';
import { SuggestionsSidebar } from '@/containers/editor/components/suggestions/SuggestionsSidebar';
import { usePaneStore } from '@/containers/editor/session/paneStore';
import { useSession } from '@/containers/editor/SessionStoreProvider';

export enum RightTab {
    Comments = 'comments',
    Suggestions = 'suggestions',
}

interface RightPaneProps {
    editor: Editor | null
}

type RightTabTKey = 'pane.comments' | 'pane.suggestions'

const TABS: { id: RightTab; icon: typeof MessageSquare; labelKey: RightTabTKey }[] = [
    { id: RightTab.Comments,    icon: MessageSquare,       labelKey: 'pane.comments' },
    { id: RightTab.Suggestions, icon: GitPullRequestArrow, labelKey: 'pane.suggestions' },
];

export function RightPane({ editor }: RightPaneProps) {
    const { t } = useTranslation('editor');
    const tab = useSession((s) => s.rightTab);
    const setRightTab = useSession((s) => s.setRightTab);
    const expandPane = usePaneStore((s) => s.expand);
    const hidePane = usePaneStore((s) => s.hide);

    const handleTabClick = (id: RightTab) => {
        setRightTab(id);
        expandPane('right');
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
                    onClick={() => hidePane('right')}
                    aria-label={t('pane.collapse')}
                    title={t('pane.collapse')}
                >
                    <X size={14} />
                </button>
            </div>

            <div className="pane-body">
                {tab === RightTab.Comments ? (
                    <CommentsSidebar editor={editor} />
                ) : (
                    <SuggestionsSidebar editor={editor} />
                )}
            </div>
        </aside>
    );
}
