import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Insertion, Deletion } from '@/editor/suggestions/TrackChange';
import { DiffBlockAttr } from '@/editor/suggestions/DiffBlockAttr';
import { Comment } from '@/editor/comments/Comment';
import { Highlight } from '@/editor/tiptap/formatting/Highlight';
import { diffStats, type JSONNode } from '@/editor/versions/diffDoc';
import { nodeToMarkdown } from '@/editor/io/markdown';
import { MarkdownInlineDiff, MarkdownSideBySide } from '@/containers/editor/components/versions/MarkdownDiffView';

const READ_ONLY_EXTENSIONS = [
    StarterKit.configure({ undoRedo: false }),
    Underline,
    Link.configure({ openOnClick: false }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Comment,
    Insertion,
    Deletion,
    DiffBlockAttr,
    Highlight,
];

const enum ViewMode {
  Rich = 'rich',
  Markdown = 'md',
}

const enum LayoutMode {
  Inline = 'inline',
  Sbs = 'sbs',
}

interface Props {
  diffJson: JSONNode
  olderJson?: JSONNode
  newerJson?: JSONNode
  olderLabel: string
  newerLabel: string
  onClose: () => void
  onRestore?: () => void
}

function ReadOnlyEditor({ json }: { json: JSONNode }) {
    const editor = useEditor(
        {
            extensions: READ_ONLY_EXTENSIONS,
            editable: false,
            content: json,
            editorProps: { attributes: { class: 'prose-editor' } },
        },
        [json],
    );
    return <EditorContent editor={editor} />;
}

export function VersionDiffModal({
    diffJson,
    olderJson,
    newerJson,
    olderLabel,
    newerLabel,
    onClose,
    onRestore,
}: Props) {
    const { t } = useTranslation('editor');
    const [view, setView] = useState<ViewMode>(ViewMode.Rich);
    const [layout, setLayout] = useState<LayoutMode>(LayoutMode.Inline);
    const stats = diffStats(diffJson);
    const sbsAvailable = !!olderJson && !!newerJson;
    const useSbs = layout === LayoutMode.Sbs && sbsAvailable;

    return (
        <div className="modal-backdrop" onMouseDown={onClose}>
            <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
                <header className="modal-header">
                    <div>
                        <div className="modal-title">{t('versions.compareTitle')}</div>
                        <div className="modal-sub">
                            <span className="version-tag version-tag-older">{olderLabel}</span>
                            <span className="modal-arrow">→</span>
                            <span className="version-tag version-tag-newer">{newerLabel}</span>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <div className="sbs-toggle">
                            <button
                                type="button"
                                className={view === ViewMode.Rich ? 'is-active' : ''}
                                onClick={() => setView(ViewMode.Rich)}
                            >
                                {t('versions.viewRich')}
                            </button>
                            <button
                                type="button"
                                className={view === ViewMode.Markdown ? 'is-active' : ''}
                                onClick={() => setView(ViewMode.Markdown)}
                            >
                                {t('versions.viewMarkdown')}
                            </button>
                        </div>
                        {sbsAvailable && (
                            <div className="sbs-toggle">
                                <button
                                    type="button"
                                    className={layout === LayoutMode.Inline ? 'is-active' : ''}
                                    onClick={() => setLayout(LayoutMode.Inline)}
                                >
                                    {t('versions.layoutInline')}
                                </button>
                                <button
                                    type="button"
                                    className={layout === LayoutMode.Sbs ? 'is-active' : ''}
                                    onClick={() => setLayout(LayoutMode.Sbs)}
                                >
                                    {t('versions.layoutSbs')}
                                </button>
                            </div>
                        )}
                        {onRestore && (
                            <button type="button" className="btn-primary" onClick={onRestore}>
                                {t('versions.restoreOlder')}
                            </button>
                        )}
                        <button type="button" onClick={onClose}>
                            {t('global.close')}
                        </button>
                    </div>
                </header>
                <div className="modal-legend">
                    <span className="legend-chunk">
                        <span className="legend-swatch legend-ins" /> {t('versions.legendAdded', { count: stats.ins })}
                    </span>
                    <span className="legend-chunk">
                        <span className="legend-swatch legend-del" /> {t('versions.legendRemoved', { count: stats.del })}
                    </span>
                </div>
                <div className="modal-body">
                    {view === ViewMode.Rich ? (
                        useSbs ? (
                            <div className="diff-sbs">
                                <div className="diff-sbs-col">
                                    <div className="diff-sbs-label">{olderLabel}</div>
                                    <div className="editor-page diff-page diff-page-older">
                                        <ReadOnlyEditor json={olderJson!} />
                                    </div>
                                </div>
                                <div className="diff-sbs-col">
                                    <div className="diff-sbs-label">{newerLabel}</div>
                                    <div className="editor-page diff-page diff-page-newer">
                                        <ReadOnlyEditor json={newerJson!} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="editor-page diff-page">
                                <ReadOnlyEditor json={diffJson} />
                            </div>
                        )
                    ) : useSbs ? (
                        <MarkdownSideBySide
                            olderJson={olderJson!}
                            newerJson={newerJson!}
                            olderLabel={olderLabel}
                            newerLabel={newerLabel}
                        />
                    ) : sbsAvailable ? (
                        <MarkdownInlineDiff olderJson={olderJson!} newerJson={newerJson!} />
                    ) : (
                        <pre className="md-diff md-diff-sbs">{nodeToMarkdown(diffJson)}</pre>
                    )}
                </div>
            </div>
        </div>
    );
}
