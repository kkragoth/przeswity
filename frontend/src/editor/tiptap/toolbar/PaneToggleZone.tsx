import { ModeToggle } from '@/editor/tiptap/ToolbarPrimitives';
import type { User } from '@/editor/identity/types';
import { ROLE_PERMISSIONS } from '@/editor/identity/types';

function hasNoAccess(user: User): boolean {
    const p = ROLE_PERMISSIONS[user.role];
    return !p.canEdit && !p.canSuggest;
}

interface PaneToggleZoneProps {
    user: User;
    suggestingMode: boolean;
    suggestingForced: boolean;
    onSuggestingModeChange: (mode: boolean) => void;
}

function Divider() {
    return <div className="tb-divider" aria-hidden />;
}

export { Divider };

export function PaneToggleZone({
    user,
    suggestingMode,
    suggestingForced,
    onSuggestingModeChange,
}: PaneToggleZoneProps) {
    if (hasNoAccess(user)) return null;
    return (
        <>
            <ModeToggle
                suggestingMode={suggestingMode}
                suggestingForced={suggestingForced}
                onSuggestingModeChange={onSuggestingModeChange}
            />
            <Divider />
        </>
    );
}
