import { useEditor, EditorContent } from '@tiptap/react';
import { READ_ONLY_EXTENSIONS } from '@/editor/versions/readOnlyExtensions';
import type { JSONNode } from '@/editor/versions/diffDoc';

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
                    <div className="editor-page diff-page diff-page-older">
                        <ReadOnlyEditor json={olderJson} />
                    </div>
                </div>
                <div className="diff-sbs-col">
                    <div className="diff-sbs-label">{newerLabel}</div>
                    <div className="editor-page diff-page diff-page-newer">
                        <ReadOnlyEditor json={newerJson} />
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className="editor-page diff-page">
            <ReadOnlyEditor json={diffJson} />
        </div>
    );
}
