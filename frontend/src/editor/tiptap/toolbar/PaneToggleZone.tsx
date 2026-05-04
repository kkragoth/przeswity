import { ModeToggle } from '@/editor/tiptap/ToolbarPrimitives';
import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useEditorLive } from '@/containers/editor/session/LiveProvider';

function Divider() {
    return <div className="tb-divider" aria-hidden />;
}

export { Divider };

export function PaneToggleZone() {
    const { perms } = useEditorSession();
    const suggesting = useEditorLive((s) => s.suggesting);

    if (!perms.canEdit && !perms.canSuggest) return null;
    return (
        <>
            <ModeToggle
                suggestingMode={suggesting.effective}
                suggestingForced={suggesting.forced}
                onSuggestingModeChange={suggesting.setMode}
            />
            <Divider />
        </>
    );
}
