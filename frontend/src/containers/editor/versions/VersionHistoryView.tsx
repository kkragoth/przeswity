import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Y from 'yjs';
import { yDocToProsemirrorJSON } from 'y-prosemirror';
import type { Editor } from '@tiptap/react';

import { bookSnapshotsListOptions, bookSnapshotStateOptions } from '@/api/generated/@tanstack/react-query.gen';
import { buildDiffDoc, diffStats, type JSONNode } from '@/editor/versions/diffDoc';
import { DiffRichView } from './components/DiffRichView';
import { DiffCommentChip } from './components/DiffCommentChip';
import { VersionComparePicker } from './components/VersionComparePicker';
import { VersionHistoryRail } from './VersionHistoryRail';
import { DiffHunkNav } from './components/DiffHunkNav';
import { useDiffCommentSources } from './hooks/useDiffCommentSources';
import {
    useEditorViewStore,
    EditorViewKind,
    DiffSideKind,
    isCurrent,
    sideId,
    type DiffSide,
} from '@/containers/editor/session/editorViewStore';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useVersionNavigation } from './hooks/useVersionNavigation';
import { friendlySideLabel } from './utils/sideLabel';
import { useTimeLabels } from './utils/useTimeLabels';
import { ToastKind } from '@/editor/shell/useToast';
import { bookSnapshotCreate } from '@/api/generated/services.gen';

enum LayoutMode {
    Inline = 'inline',
    Sbs = 'sbs',
}

interface VersionHistoryViewProps {
    editor: Editor | null;
}

async function stateToJson(stateBytes: Blob | ArrayBuffer, schemaName = 'default'): Promise<JSONNode> {
    const buffer = stateBytes instanceof Blob ? await stateBytes.arrayBuffer() : stateBytes;
    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(buffer));
    const json = yDocToProsemirrorJSON(doc, schemaName) as JSONNode;
    doc.destroy();
    return json;
}


function countBlockHunks(node: JSONNode): number {
    let count = 0;
    if (node.attrs?.diffBlock) count++;
    (node.content ?? []).forEach((child) => { count += countBlockHunks(child); });
    return count;
}

function layoutStorageKey(bookId: string): string {
    return `versionDiffLayout:${bookId}`;
}

function loadLayout(bookId: string): LayoutMode {
    try {
        const stored = localStorage.getItem(layoutStorageKey(bookId));
        if (stored === LayoutMode.Sbs) return LayoutMode.Sbs;
    } catch { /* ignore */ }
    return LayoutMode.Inline;
}

function saveLayout(bookId: string, mode: LayoutMode): void {
    try {
        localStorage.setItem(layoutStorageKey(bookId), mode);
    } catch { /* ignore */ }
}

export function VersionHistoryView({ editor }: VersionHistoryViewProps) {
    const { t } = useTranslation('editor');
    const { bookId, toast, collab } = useEditorSession();
    const view = useEditorViewStore((s) => s.view);
    const { close: closeVersionHistory } = useVersionNavigation();
    const queryClient = useQueryClient();

    const [layout, setLayout] = useState<LayoutMode>(() => loadLayout(bookId));
    const [activeHunk, setActiveHunk] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const isCompare = view.kind === EditorViewKind.VersionHistory;
    const left: DiffSide = isCompare ? view.left : { kind: DiffSideKind.Current };
    const right: DiffSide = isCompare ? view.right : { kind: DiffSideKind.Current };

    const leftId = sideId(left);
    const rightId = sideId(right);

    const { data: snapshots = [] } = useQuery(bookSnapshotsListOptions({ path: { bookId } }));

    const { data: leftBytes } = useQuery({
        ...bookSnapshotStateOptions({ path: { bookId, id: leftId ?? '' } }),
        enabled: !!leftId,
    });

    const { data: rightBytes } = useQuery({
        ...bookSnapshotStateOptions({ path: { bookId, id: rightId ?? '' } }),
        enabled: !!rightId,
    });

    const [diffJson, setDiffJson] = useState<JSONNode | null>(null);
    const [leftJson, setLeftJson] = useState<JSONNode | null>(null);

    useEffect(() => {
        if (!editor) return;
        const leftReady = isCurrent(left) || leftBytes;
        const rightReady = isCurrent(right) || rightBytes;
        if (!leftReady || !rightReady) return;

        const leftPromise = isCurrent(left)
            ? Promise.resolve(editor.getJSON() as JSONNode)
            : stateToJson(leftBytes as Blob);
        const rightPromise = isCurrent(right)
            ? Promise.resolve(editor.getJSON() as JSONNode)
            : stateToJson(rightBytes as Blob);

        void Promise.all([leftPromise, rightPromise]).then(([l, r]) => {
            setLeftJson(l);
            setDiffJson(buildDiffDoc(editor.schema, l, r));
            setActiveHunk(0);
        });
    }, [leftBytes, rightBytes, left, right, editor]);

    const stats = useMemo(() => (diffJson ? diffStats(diffJson) : { ins: 0, del: 0 }), [diffJson]);
    const blockHunks = useMemo(() => (diffJson ? countBlockHunks(diffJson) : 0), [diffJson]);

    const sbsAvailable = !!diffJson;
    const useSbs = layout === LayoutMode.Sbs && sbsAvailable;

    const handleLayoutChange = (mode: LayoutMode) => {
        setLayout(mode);
        saveLayout(bookId, mode);
    };

    const scrollToHunk = (index: number) => {
        const container = containerRef.current;
        if (!container) return;
        const hunks = Array.from(container.querySelectorAll('[data-diff-block]'));
        if (hunks[index]) {
            hunks[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setActiveHunk(index);
    };

    const handlePrev = () => scrollToHunk(Math.max(0, activeHunk - 1));
    const handleNext = () => scrollToHunk(Math.min(blockHunks - 1, activeHunk + 1));

    const currentLabel = t('versionHistory.current');
    const timeLabels = useTimeLabels();
    const leftLabel = friendlySideLabel(left, snapshots, currentLabel, timeLabels);
    const rightLabel = friendlySideLabel(right, snapshots, currentLabel, timeLabels);

    const commentSources = useDiffCommentSources(left, right, leftBytes as Blob | undefined, rightBytes as Blob | undefined, collab.doc);

    const canRestore = !isCurrent(left) && isCurrent(right);
    const handleRestore = async () => {
        if (!leftJson || !editor) return;
        try {
            await bookSnapshotCreate({
                path: { bookId },
                body: { label: `auto:${new Date().toISOString()}` },
            });
            editor.commands.setContent(leftJson, { emitUpdate: true });
            void queryClient.invalidateQueries({ queryKey: ['bookSnapshotsList'] });
            toast(t('versions.restoreSuccess', { label: leftLabel }), ToastKind.Success);
            closeVersionHistory();
        } catch {
            toast(t('versions.editorNotReady'), ToastKind.Error);
        }
    };

    return (
        <div className="vh-host">
            <VersionComparePicker
                left={left}
                right={right}
                snapshots={snapshots}
                onRestore={canRestore ? () => void handleRestore() : undefined}
            >
                {diffJson && !useSbs && (
                    <div className="vh-toolbar-stats">
                        <span className="vh-stat is-ins">+{stats.ins}</span>
                        <span className="vh-stat is-del">−{stats.del}</span>
                        {blockHunks > 0 && (
                            <span className="vh-stat is-blocks">{t('versions.statsBlocksShort', { count: blockHunks })}</span>
                        )}
                    </div>
                )}
                <DiffCommentChip
                    leftSource={commentSources.left}
                    rightSource={commentSources.right}
                    leftLabel={leftLabel}
                    rightLabel={rightLabel}
                />
                <div className="vh-toolbar-layout">
                    <button
                        type="button"
                        className={`vh-layout-btn${layout === LayoutMode.Inline ? ' is-active' : ''}`}
                        onClick={() => handleLayoutChange(LayoutMode.Inline)}
                    >
                        {t('versions.layoutInline')}
                    </button>
                    <button
                        type="button"
                        className={`vh-layout-btn${layout === LayoutMode.Sbs ? ' is-active' : ''}`}
                        disabled={!sbsAvailable}
                        onClick={() => handleLayoutChange(LayoutMode.Sbs)}
                    >
                        {t('versions.layoutSbs')}
                    </button>
                </div>
            </VersionComparePicker>
            <div className="vh-body">
                <div className="editor-scroll vh-main" ref={containerRef}>
                    {!diffJson ? (
                        <div className="sidebar-empty">{t('global.loading')}</div>
                    ) : (
                        <DiffRichView
                            diffJson={diffJson}
                            olderLabel={leftLabel}
                            newerLabel={rightLabel}
                            useSbs={useSbs}
                        />
                    )}
                    {diffJson && !useSbs && blockHunks > 0 && (
                        <DiffHunkNav
                            total={blockHunks}
                            active={activeHunk}
                            onPrev={handlePrev}
                            onNext={handleNext}
                        />
                    )}
                </div>
                <VersionHistoryRail snapshots={snapshots} left={left} right={right} />
            </div>
        </div>
    );
}
