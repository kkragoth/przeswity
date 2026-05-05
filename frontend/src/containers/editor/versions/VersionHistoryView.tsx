import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import * as Y from 'yjs';
import { yDocToProsemirrorJSON } from 'y-prosemirror';
import type { Editor } from '@tiptap/react';

import { bookSnapshotsListOptions, bookSnapshotStateOptions } from '@/api/generated/@tanstack/react-query.gen';
import { buildDiffDoc, type JSONNode } from '@/editor/versions/diffDoc';
import { DiffRichView } from './components/DiffRichView';
import { VersionComparePicker } from './components/VersionComparePicker';
import { VersionHistoryRail } from './VersionHistoryRail';
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
import { ToastKind } from '@/editor/shell/useToast';
import { bookSnapshotCreate } from '@/api/generated/services.gen';
import type { SnapshotSummary } from '@/api/generated/types.gen';

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

function sideLabel(side: DiffSide, snapshots: SnapshotSummary[], currentLabel: string): string {
    if (isCurrent(side)) return currentLabel;
    return snapshots.find((s) => s.id === side.id)?.label ?? side.id;
}

export function VersionHistoryView({ editor }: VersionHistoryViewProps) {
    const { t } = useTranslation('editor');
    const { bookId, toast } = useEditorSession();
    const view = useEditorViewStore((s) => s.view);
    const { close: closeVersionHistory } = useVersionNavigation();

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
    const [rightJson, setRightJson] = useState<JSONNode | null>(null);

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
            setRightJson(r);
            setDiffJson(buildDiffDoc(editor.schema, l, r));
        });
    }, [leftBytes, rightBytes, left, right, editor]);

    const currentLabel = t('versionHistory.current');
    const leftLabel = sideLabel(left, snapshots, currentLabel);
    const rightLabel = sideLabel(right, snapshots, currentLabel);

    const canRestore = !isCurrent(left) && isCurrent(right);
    const handleRestore = async () => {
        if (!leftJson || !editor) return;
        try {
            await bookSnapshotCreate({
                path: { bookId },
                body: { label: `pre-restore:${new Date().toISOString()}` },
            });
            editor.commands.setContent(leftJson, { emitUpdate: true });
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
            />
            <div className="vh-body">
                <div className="editor-scroll vh-main">
                    {!diffJson ? (
                        <div className="sidebar-empty">{t('global.loading')}</div>
                    ) : (
                        <DiffRichView
                            diffJson={diffJson}
                            olderJson={leftJson ?? undefined}
                            newerJson={rightJson ?? undefined}
                            olderLabel={leftLabel}
                            newerLabel={rightLabel}
                            useSbs={false}
                        />
                    )}
                </div>
                <VersionHistoryRail snapshots={snapshots} left={left} right={right} />
            </div>
        </div>
    );
}
