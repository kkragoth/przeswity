import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Insertion, Deletion } from '../suggestions/TrackChange';
import { Comment } from '../comments/Comment';
import { Highlight } from '../editor/formatting/Highlight';
import type { JSONNode } from './diffDoc';
import { diffStats } from './diffDoc';

const READ_ONLY_EXTENSIONS = [
    StarterKit.configure({ history: false }),
    Underline,
    Link.configure({ openOnClick: false }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Comment,
    Insertion,
    Deletion,
    Highlight,
];

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
    const [mode, setMode] = useState<'inline' | 'sbs'>('inline');
    const stats = diffStats(diffJson);
    const sbsAvailable = !!olderJson && !!newerJson;

    return (
        <div className="modal-backdrop" onMouseDown={onClose}>
            <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
                <header className="modal-header">
                    <div>
                        <div className="modal-title">Compare versions</div>
                        <div className="modal-sub">
                            <span className="version-tag version-tag-older">{olderLabel}</span>
                            <span className="modal-arrow">→</span>
                            <span className="version-tag version-tag-newer">{newerLabel}</span>
                        </div>
                    </div>
                    <div className="modal-actions">
                        {sbsAvailable && (
                            <div className="sbs-toggle">
                                <button
                                    type="button"
                                    className={mode === 'inline' ? 'is-active' : ''}
                                    onClick={() => setMode('inline')}
                                >
                  Inline
                                </button>
                                <button
                                    type="button"
                                    className={mode === 'sbs' ? 'is-active' : ''}
                                    onClick={() => setMode('sbs')}
                                >
                  Side by side
                                </button>
                            </div>
                        )}
                        {onRestore && (
                            <button type="button" className="btn-primary" onClick={onRestore}>
                Restore older
                            </button>
                        )}
                        <button type="button" onClick={onClose}>
              Close
                        </button>
                    </div>
                </header>
                <div className="modal-legend">
                    <span className="legend-chunk">
                        <span className="legend-swatch legend-ins" /> added (+{stats.ins} chars)
                    </span>
                    <span className="legend-chunk">
                        <span className="legend-swatch legend-del" /> removed (−{stats.del} chars)
                    </span>
                </div>
                <div className="modal-body">
                    {mode === 'inline' || !sbsAvailable ? (
                        <div className="editor-page diff-page">
                            <ReadOnlyEditor json={diffJson} />
                        </div>
                    ) : (
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
                    )}
                </div>
            </div>
        </div>
    );
}
