import { useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import type { CollabBundle } from '@/editor/collab/yDoc';
import type { User } from '@/editor/identity/types';
import { AWARENESS_ACTIVITY_THROTTLE_MS } from '@/editor/constants';

/**
 * Keeps our user info in sync with the awareness provider, and throttles
 * lastActiveAt updates on selection/text activity so peers can fade out our label.
 */
export function useAwarenessSync(
    editor: Editor | null,
    provider: CollabBundle['provider'],
    user: Pick<User, 'id' | 'name' | 'color'>,
): void {
    useEffect(() => {
        if (!editor) return;
        const awareness = provider.awareness;
        if (!awareness) return;

        const setUser = (lastActiveAt: number) => {
            awareness.setLocalStateField('user', {
                name: user.name,
                color: user.color,
                userId: user.id,
                lastActiveAt,
            });
        };

        setUser(Date.now());

        let pendingTimer: ReturnType<typeof setTimeout> | null = null;
        const onActivity = () => {
            if (pendingTimer !== null) return;
            pendingTimer = setTimeout(() => {
                pendingTimer = null;
                setUser(Date.now());
            }, AWARENESS_ACTIVITY_THROTTLE_MS);
        };
        editor.on('selectionUpdate', onActivity);
        editor.on('update', onActivity);
        return () => {
            editor.off('selectionUpdate', onActivity);
            editor.off('update', onActivity);
            if (pendingTimer !== null) {
                clearTimeout(pendingTimer);
                pendingTimer = null;
            }
        };
    }, [provider, editor, user.id, user.name, user.color]);
}
