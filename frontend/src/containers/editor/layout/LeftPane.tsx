import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
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
import { useEditorHeadings } from '@/containers/editor/hooks/useEditorHeadings';
import { EmptyState } from '@/containers/editor/layout/EmptyState';
import { usePaneStore } from '@/containers/editor/session/paneStore';
import { useSession } from '@/containers/editor/SessionStoreProvider';

export enum LeftTab {
    Outline = 'outline',
    Versions = 'versions',
    Glossary = 'glossary',
    Meta = 'meta',
    Files = 'files',
}

interface LeftPaneProps {
    editor: Editor | null
}

type TabTKey =
    | 'pane.outline'
    | 'pane.versions'
    | 'pane.glossary'
    | 'pane.meta'
    | 'pane.files'

const TABS: { id: LeftTab; icon: typeof ListTree; labelKey: TabTKey }[] = [
    { id: LeftTab.Outline,  icon: ListTree,  labelKey: 'pane.outline' },
    { id: LeftTab.Versions, icon: History,   labelKey: 'pane.versions' },
    { id: LeftTab.Glossary, icon: BookOpen,  labelKey: 'pane.glossary' },
    { id: LeftTab.Meta,     icon: FileText,  labelKey: 'pane.meta' },
    { id: LeftTab.Files,    icon: Folder,    labelKey: 'pane.files' },
];

function OutlineGhostIcon() {
    return (
        <svg width="40" height="32" viewBox="0 0 40 32" fill="none" aria-hidden="true">
            <rect x="0" y="4"  width="32" height="3" rx="1.5" fill="currentColor" />
            <rect x="6" y="13" width="26" height="3" rx="1.5" fill="currentColor" />
            <rect x="6" y="22" width="20" height="3" rx="1.5" fill="currentColor" />
        </svg>
    );
}

export function LeftPane({ editor }: LeftPaneProps) {
    const { t } = useTranslation('editor');
    const tab = useSession((s) => s.leftTab);
    const setLeftTab = useSession((s) => s.setLeftTab);
    const hasHeadings = useEditorHeadings(editor);
    const expandPane = usePaneStore((s) => s.expand);
    const railPane = usePaneStore((s) => s.rail);
    const activeLabelKey = TABS.find((e) => e.id === tab)!.labelKey;

    const handleTabClick = (id: LeftTab) => {
        setLeftTab(id);
        expandPane('left');
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
                <h2 className="pane-title">{t(activeLabelKey)}</h2>
                <button
                    type="button"
                    className="pane-collapse"
                    onClick={() => railPane('left')}
                    title={t('pane.collapse')}
                    aria-label={t('pane.collapse')}
                >
                    <PanelLeftClose size={15} strokeWidth={1.75} />
                </button>
            </div>

            <div className="pane-body">
                {tab === LeftTab.Outline && (
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
                {tab === LeftTab.Versions && <VersionsPanel editor={editor} />}
                {tab === LeftTab.Glossary && <GlossaryPanel />}
                {tab === LeftTab.Meta && <MetaPanel />}
                {tab === LeftTab.Files && (
                    <EmptyState
                        icon={<Folder size={32} strokeWidth={1.25} />}
                        title={t('filesPlaceholder')}
                    />
                )}
            </div>
        </aside>
    );
}
