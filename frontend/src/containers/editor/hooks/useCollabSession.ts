import { useEffect, useState } from 'react';
import { createCollab, type CollabBundle } from '@/editor/collab/yDoc';

export function useCollabSession({ bookId }: { bookId: string }) {
    const [collab, setCollab] = useState<CollabBundle | null>(null);

    useEffect(() => {
        const bundle = createCollab(bookId);
        setCollab(bundle);
        return () => {
            bundle.provider.destroy();
            bundle.persistence.destroy();
            bundle.doc.destroy();
            setCollab((current) => (current === bundle ? null : current));
        };
    }, [bookId]);

    return { collab };
}
