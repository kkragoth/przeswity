import type { Editor } from '@tiptap/react';
import { ThreadsSidebar } from '@/containers/editor/threads/ThreadsSidebar';

// RightTab enum kept for backward compatibility with sessionStore references.
export enum RightTab {
    Comments = 'comments',
    Suggestions = 'suggestions',
}

interface RightPaneProps {
    editor: Editor | null
}

export function RightPane({ editor }: RightPaneProps) {
    return (
        <aside className="right-pane">
            <div className="pane-body">
                <ThreadsSidebar editor={editor} />
            </div>
        </aside>
    );
}
