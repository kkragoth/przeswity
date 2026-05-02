import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';

export function useEditorHeadings(editor: Editor | null): boolean {
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
