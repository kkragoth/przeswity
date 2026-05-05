import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { READ_ONLY_EXTENSIONS } from '@/editor/versions/readOnlyExtensions';
import type { JSONNode } from '@/editor/versions/diffDoc';

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
    olderJson?: JSONNode;
    newerJson?: JSONNode;
    olderLabel: string;
    newerLabel: string;
    useSbs: boolean;
}

export function DiffRichView({ diffJson, olderJson, newerJson, olderLabel, newerLabel, useSbs }: DiffRichViewProps) {
    if (useSbs && olderJson && newerJson) {
        return (
            <div className="diff-sbs">
                <div className="diff-sbs-col">
                    <div className="diff-sbs-label">{olderLabel}</div>
                    <ReadOnlyEditor json={olderJson} />
                </div>
                <div className="diff-sbs-col">
                    <div className="diff-sbs-label">{newerLabel}</div>
                    <ReadOnlyEditor json={newerJson} />
                </div>
            </div>
        );
    }
    return <ReadOnlyEditor json={diffJson} diff />;
}
