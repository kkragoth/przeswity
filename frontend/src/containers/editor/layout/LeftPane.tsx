import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import {
    ListTree,
    History,
    BookOpen,
    FileText,
    Folder,
    PanelLeftClose,
    PanelLeftOpen,
} from 'lucide-react';

import { OutlineSidebar } from '@/containers/editor/outline';
import { VersionsPanel } from '@/containers/editor/versions';
import { GlossaryPanel } from '@/containers/editor/glossary';
import { MetaPanel } from '@/containers/editor/meta';
import { useEditorHeadings } from '@/containers/editor/outline/hooks/useEditorHeadings';
import { EmptyState } from '@/containers/editor/layout/EmptyState';
import { PaneState, usePaneStore } from '@/containers/editor/session/paneStore';
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

function VrailButton({ id, Icon, label, isActive, isRail, onClick }: {
    id: LeftTab
    Icon: typeof ListTree
    label: string
    isActive: boolean
    isRail: boolean
    onClick: (id: LeftTab) => void
}) {
    const button = (
        <button
            type="button"
            className={`vrail-btn${isActive ? ' is-active' : ''}`}
            onClick={() => onClick(id)}
            aria-label={label}
            title={isRail ? undefined : label}
        >
            <span className="vrail-btn-icon">
                <Icon size={16} strokeWidth={1.75} />
            </span>
            <span className="vrail-btn-label">{label}</span>
        </button>
    );
    if (!isRail) return button;
    return (
        <TooltipPrimitive.Root>
            <TooltipPrimitive.Trigger asChild>{button}</TooltipPrimitive.Trigger>
            <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content className="tb-tooltip" side="right" sideOffset={6}>
                    {label}
                </TooltipPrimitive.Content>
            </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
    );
}

export function LeftPane({ editor }: LeftPaneProps) {
    const { t } = useTranslation('editor');
    const tab = useSession((s) => s.leftTab);
    const setLeftTab = useSession((s) => s.setLeftTab);
    const hasHeadings = useEditorHeadings(editor);
    const expandPane = usePaneStore((s) => s.expand);
    const railPane = usePaneStore((s) => s.rail);
    const leftState = usePaneStore((s) => s.left);
    const isRail = leftState !== PaneState.Expanded;
    const activeLabelKey = TABS.find((e) => e.id === tab)!.labelKey;

    const handleTabClick = (id: LeftTab) => {
        setLeftTab(id);
        if (isRail) expandPane('left');
    };

    const togglePane = () => (isRail ? expandPane('left') : railPane('left'));
    const toggleLabel = isRail ? t('pane.expand') : t('pane.collapse');
    const ToggleIcon = isRail ? PanelLeftOpen : PanelLeftClose;

    return (
        <aside className="left-pane">
            <TooltipPrimitive.Provider delayDuration={400}>
                <div className="vrail-header">
                    <button
                        type="button"
                        className="vrail-toggle"
                        onClick={togglePane}
                        title={toggleLabel}
                        aria-label={toggleLabel}
                        aria-expanded={!isRail}
                    >
                        <ToggleIcon size={15} strokeWidth={1.75} />
                    </button>
                </div>
                <nav className="vrail" aria-label={t('pane.outline')}>
                    {TABS.map(({ id, icon: Icon, labelKey }) => (
                        <VrailButton
                            key={id}
                            id={id}
                            Icon={Icon}
                            label={t(labelKey)}
                            isActive={tab === id}
                            isRail={isRail}
                            onClick={handleTabClick}
                        />
                    ))}
                </nav>
            </TooltipPrimitive.Provider>

            <div className="pane-header">
                <h2 className="pane-title">{t(activeLabelKey)}</h2>
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
