import type { ReactNode } from 'react';
import type { User } from '@/editor/identity/types';
import type { CollabBundle } from '@/editor/collab/yDoc';
import { useToast } from '@/editor/shell/useToast';
import { EditorSessionProvider } from '@/containers/editor/session/SessionProvider';
import { EditorLiveProvider } from '@/containers/editor/session/LiveProvider';
import { SessionStoreProvider } from '@/containers/editor/SessionStoreProvider';
import { CommentsStoreProvider } from '@/containers/editor/comments/store/CommentsStoreProvider';

interface ProvidersProps {
    bookId: string
    bookTitle: string
    user: User
    collab: CollabBundle
    children: ReactNode
}

export function Providers({ bookId, bookTitle, user, collab, children }: ProvidersProps) {
    const toast = useToast();
    return (
        <EditorSessionProvider user={user} bookId={bookId} bookTitle={bookTitle} collab={collab} toast={toast.show}>
            <EditorLiveProvider>
                <SessionStoreProvider>
                    <CommentsStoreProvider>
                        {children}
                    </CommentsStoreProvider>
                </SessionStoreProvider>
            </EditorLiveProvider>
        </EditorSessionProvider>
    );
}
