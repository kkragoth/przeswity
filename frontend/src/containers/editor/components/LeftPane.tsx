import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
import * as Y from 'yjs';
import {
    ListTree,
    History,
    BookOpen,
    FileText,
    Folder,
    PanelLeftClose,
} from 'lucide-react';

import { OutlineSidebar } from '@/containers/editor/components/outline/OutlineSidebar';
import { VersionsPanel } from '@/containers/editor/components/versions/VersionsPanel';
import { GlossaryPanel } from '@/containers/editor/components/glossary/GlossaryPanel';
import { MetaPanel } from '@/containers/editor/components/meta/MetaPanel';
import type { User } from '@/editor/identity/types';
import type { PaneState } from '@/containers/editor/hooks/usePaneState';
import { EmptyState } from '@/containers/editor/components/EmptyState';

export type LeftTab = 'outline' | 'versions' | 'glossary' | 'meta' | 'files'

interface LeftPaneProps {
    tab: LeftTab
    onTabChange: (t: LeftTab) => void
    paneState: PaneState
    onExpand: () => void
    onRail: () => void
    onHide: () => void
    doc: Y.Doc
    user: User
    editor: Editor | null
    onToast: (msg: string, kind?: 'info' | 'success' | 'error') => void
}

type TabTKey =
    | 'pane.outline'
    | 'pane.versions'
    | 'pane.glossary'
    | 'pane.meta'
    | 'pane.files'

const TABS: { id: LeftTab; icon: typeof ListTree; labelKey: TabTKey }[] = [
    { id: 'outline',  icon: ListTree,  labelKey: 'pane.outline' },
    { id: 'versions', icon: History,   labelKey: 'pane.versions' },
    { id: 'glossary', icon: BookOpen,  labelKey: 'pane.glossary' },
    { id: 'meta',     icon: FileText,  labelKey: 'pane.meta' },
    { id: 'files',    icon: Folder,    labelKey: 'pane.files' },
];

const TAB_TITLE: Record<LeftTab, TabTKey> = {
    outline:  'pane.outline',
    versions: 'pane.versions',
    glossary: 'pane.glossary',
    meta:     'pane.meta',
    files:    'pane.files',
};

function OutlineGhostIcon() {
    return (
        <svg width="40" height="32" viewBox="0 0 40 32" fill="none" aria-hidden="true">
            <rect x="0" y="4"  width="32" height="3" rx="1.5" fill="currentColor" />
            <rect x="6" y="13" width="26" height="3" rx="1.5" fill="currentColor" />
            <rect x="6" y="22" width="20" height="3" rx="1.5" fill="currentColor" />
        </svg>
    );
}

function useHasHeadings(editor: Editor | null): boolean {
    const [hasHeadings, setHasHeadings] = useState(false);

    useEffect(() => {
        if (!editor) return;
        const check = () => {
            let found = false;
            editor.state.doc.descendants((node) => {
                if (node.type.name === 'heading') { found = true; return false; }
                return true;
            });
            setHasHeadings(found);
        };
        check();
        editor.on('update', check);
        return () => { editor.off('update', check); };
    }, [editor]);

    return hasHeadings;
}

export function LeftPane({
    tab,
    onTabChange,
    onRail,
    onExpand,
    editor,
    doc,
    user,
    onToast,
}: LeftPaneProps) {
    const { t } = useTranslation('editor');
    const hasHeadings = useHasHeadings(editor);

    const handleTabClick = (id: LeftTab) => {
        onTabChange(id);
        onExpand();
    };

    return (
        <aside className="left-pane">
            <nav className="vrail" aria-label={t('pane.outline')}>
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
                    <PanelLeftClose size={15} strokeWidth={1.75} />
                </button>
            </div>

            <div className="pane-body">
                {tab === 'outline' && (
                    <>
                        {!hasHeadings && editor ? (
                            <EmptyState
                                icon={<OutlineGhostIcon />}
                                title={t('outlineEmpty.title')}
                                action={{
                                    label: t('outlineEmpty.action'),
                                    onClick: () =>
                                        editor.chain().focus().setHeading({ level: 1 }).run(),
                                }}
                            />
                        ) : (
                            <OutlineSidebar editor={editor} />
                        )}
                    </>
                )}
                {tab === 'versions' && (
                    <VersionsPanel doc={doc} user={user} editor={editor} onToast={onToast} />
                )}
                {tab === 'glossary' && <GlossaryPanel doc={doc} />}
                {tab === 'meta' && <MetaPanel doc={doc} />}
                {tab === 'files' && (
                    <EmptyState
                        icon={<Folder size={32} strokeWidth={1.25} />}
                        title={t('filesPlaceholder')}
                    />
                )}
            </div>
        </aside>
    );
}
