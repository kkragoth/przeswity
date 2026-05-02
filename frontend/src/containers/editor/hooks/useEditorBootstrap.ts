import { FONT_VARIANTS } from '@/editor/io/typography';
import { useCollabSession } from '@/containers/editor/hooks/useCollabSession';
import { useFontsReady } from '@/containers/editor/hooks/useFontsReady';
import { useInitialSync } from '@/containers/editor/hooks/useInitialSync';

export function useEditorBootstrap({ bookId }: { bookId: string }) {
    const { collab } = useCollabSession({ bookId });
    const fontsReady = useFontsReady(FONT_VARIANTS);
    const syncDone = useInitialSync(collab);
    return { collab, ready: Boolean(collab) && fontsReady && syncDone };
}
