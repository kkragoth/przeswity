import '@/editor/styles.css';
import { useMemo } from 'react';

import type { User, Role } from '@/editor/identity/types';
import { useCollabSession } from '@/containers/editor/hooks/useCollabSession';
import { useFontsReady } from '@/containers/editor/hooks/useFontsReady';
import { useInitialSync } from '@/containers/editor/hooks/useInitialSync';
import { FONT_VARIANTS } from '@/editor/io/typography';
import { EditorSkeleton } from '@/containers/editor/layout/EditorSkeleton';
import { Providers } from './Providers';
import { EditorLayout } from './EditorLayout';

interface EditorHostProps {
    bookId: string;
    user: { id: string; name: string; color: string; role: string };
    bookTitle: string;
}

export function EditorHost({ bookId, user: userProp, bookTitle }: EditorHostProps) {
    const { collab } = useCollabSession({ bookId });
    const fontsReady = useFontsReady(FONT_VARIANTS);
    const syncDone = useInitialSync(collab);
    const ready = Boolean(collab) && fontsReady && syncDone;
    const user: User = useMemo(
        () => ({ id: userProp.id, name: userProp.name, color: userProp.color, role: userProp.role as Role }),
        [userProp.id, userProp.name, userProp.color, userProp.role],
    );
    if (!ready || !collab) return <EditorSkeleton bookTitle={bookTitle} />;
    return (
        <Providers key={collab.id} bookId={bookId} bookTitle={bookTitle} user={user} collab={collab}>
            <EditorLayout collab={collab} />
        </Providers>
    );
}
