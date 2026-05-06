import { useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { READ_ONLY_EXTENSIONS } from '@/editor/versions/readOnlyExtensions';
import type { JSONNode } from '@/editor/versions/diffDoc';
import { splitDiffSides } from '@/editor/versions/splitDiffSides';

interface ReadOnlyEditorProps {
    json: JSONNode;
    /** Activates GitHub-style diff styling (`.diff-page` rules in shell.css). */
    diff?: boolean;
}

function ReadOnlyEditor({ json, diff = false }: ReadOnlyEditorProps) {
    const editor = useEditor({
        extensions: READ_ONLY_EXTENSIONS,
        editable: false,
        content: json,
        editorProps: { attributes: { class: 'prose-editor' } },
    });

    useEffect(() => {
        if (!editor || editor.isDestroyed) return;
        editor.commands.setContent(json, { emitUpdate: false });
    }, [editor, json]);

    return (
        <div className={diff ? 'editor-page diff-page' : 'editor-page'}>
            <EditorContent editor={editor} />
        </div>
    );
}

interface DiffRichViewProps {
    diffJson: JSONNode;
    olderLabel: string;
    newerLabel: string;
    useSbs: boolean;
}

export function DiffRichView({ diffJson, olderLabel, newerLabel, useSbs }: DiffRichViewProps) {
    const sides = useMemo(() => (useSbs ? splitDiffSides(diffJson) : null), [diffJson, useSbs]);

    if (useSbs && sides) {
        return (
            <div className="diff-sbs">
                <div className="diff-sbs-col">
                    <div className="diff-sbs-label">{olderLabel}</div>
                    <ReadOnlyEditor json={sides.older} diff />
                </div>
                <div className="diff-sbs-col">
                    <div className="diff-sbs-label">{newerLabel}</div>
                    <ReadOnlyEditor json={sides.newer} diff />
                </div>
            </div>
        );
    }
    return <ReadOnlyEditor json={diffJson} diff />;
}
